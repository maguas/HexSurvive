import { execSync } from 'child_process';

console.log("🧪 Running All Test Suites...\n");
console.log("=".repeat(50));

const tests = [
    { name: "Core Rules", file: "test/test_rules.js" },
    { name: "Combat Basic", file: "prototype/test/test_combat.js" },
    { name: "Combat Advanced", file: "test/test_combat_advanced.js" },
    { name: "Resource Generation", file: "test/test_resource_generation.js" },
    { name: "Movement & Exploration", file: "test/test_movement_exploration.js" }
];

let passed = 0;
let failed = 0;

for (const test of tests) {
    try {
        console.log(`\n📋 Running: ${test.name}...`);
        execSync(`node ${test.file}`, { 
            stdio: 'inherit',
            encoding: 'utf-8'
        });
        passed++;
    } catch (error) {
        console.error(`❌ FAILED: ${test.name}`);
        failed++;
    }
}

console.log("\n" + "=".repeat(50));
console.log(`\n🏁 Test Summary: ${passed}/${tests.length} passed`);

if (failed > 0) {
    console.error(`❌ ${failed} test suite(s) failed`);
    process.exit(1);
} else {
    console.log("✅ All test suites passed!");
    process.exit(0);
}
