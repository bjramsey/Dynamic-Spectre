const { test, expect } = require('@playwright/test');

test.describe('Spectre Tiling Geometry & Logic', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('getDynamicSpectrePoints should be available and return expected number of points', async ({ page }) => {
        const pointsLength = await page.evaluate(() => {
            // getDynamicSpectrePoints is a global function in spectre.js
            return getDynamicSpectrePoints(1.0, 1.0).length;
        });
        expect(pointsLength).toBe(14);
    });

    test('getBounds should accurately calculate bounding box', async ({ page }) => {
        const bounds = await page.evaluate(() => {
            const shape = new Shape([pt(0, 0), pt(10, 0), pt(10, 10), pt(0, 10)], [], 'Delta');
            const box = { minx: Infinity, miny: Infinity, maxx: -Infinity, maxy: -Infinity };
            shape.getBounds([1, 0, 0, 0, 1, 0], box); // identity transform
            return box;
        });

        expect(bounds).toEqual({
            minx: 0,
            miny: 0,
            maxx: 10,
            maxy: 10
        });
    });

    test('Meta class child management', async ({ page }) => {
        const childCount = await page.evaluate(() => {
            const meta = new Meta();
            meta.addChild(new Shape([], [], 'Xi'), [1, 0, 0, 0, 1, 0]);
            return meta.geoms.length;
        });
        expect(childCount).toBe(1);
    });

    test('Spectre tiles should align correctly under tiling rules', async ({ page }) => {
        const alignmentResults = await page.evaluate(() => {
            // Helper from debug_tiling.js (since it might not be global/p5 might be tricky inside evaluate context if not ready)
            // But p5 and spectre are loaded.
            
            const a = 1.0, b = 1.732;
            const pts = getDynamicSpectrePoints(a, b);
            
            // Reconstruct quad from points as in debug_tiling.js
            // debug_tiling.js: pts[3], pts[5], pts[7], pts[11]
            // Note: indices must match getDynamicSpectrePoints order which should be stable.
            const quad = [
                pts[3], pts[5], pts[7], pts[11]
            ];

            const t_rules = [
                [60, 3, 1], [0, 2, 0], [60, 3, 1], [60, 3, 1],
                [0, 2, 0], [60, 3, 1], [-120, 3, 3]
            ];

            const ident = [1, 0, 0, 0, 1, 0];
            const Ts = [ident];
            let total_ang = 0;
            let rot = ident;
            const tquad = [...quad]; // shallow copy

            // Build transformations
            for (const [ang, from, to] of t_rules) {
                total_ang += ang;
                if (ang !== 0) {
                    rot = trot(radians(total_ang)); // p5.js radians() should be available
                    for (let i = 0; i < 4; ++i) {
                        tquad[i] = transPt(rot, quad[i]);
                    }
                }
                const p_v = transPt(Ts[Ts.length - 1], quad[from]);
                const c_v = tquad[to];
                // ttrans, mul, transPt are global in spectre.js
                const ttt = ttrans(p_v.x - c_v.x, p_v.y - c_v.y);
                Ts.push(mul(ttt, rot));
            }

            function distSq(p1, p2) {
                return (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
            }

            // Verify matches
            const results = [];
            for (let i = 1; i < Ts.length; i++) {
                const childTs = Ts[i];
                const parentTs = Ts[i - 1];

                let matchCount = 0;
                for (let q1 = 0; q1 < pts.length; q1++) {
                    for (let q2 = 0; q2 < pts.length; q2++) {
                        const p1 = transPt(parentTs, pts[q1]);
                        const p2 = transPt(childTs, pts[q2]);
                        if (distSq(p1, p2) < 0.0001) {
                            matchCount++;
                        }
                    }
                }
                results.push({ index: i, matchCount });
            }
            return results;
        });

        // Assert that every step had at least one shared vertex
        for (const res of alignmentResults) {
            expect(res.matchCount, `Tile ${res.index} should share vertices with its parent`).toBeGreaterThan(0);
        }
    });

});
