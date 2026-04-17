import { test as testAldia } from './test_aldia.js';
import { test as testSolex } from './test_solex.js';
import { test as testCoordinadora } from './test_coordinadora.js';

async function runAllTests() {
    console.log('=== Running all tests ===\n');

    try {
        console.log('--- Running Aldia Tests ---');
        await testAldia();
        console.log('✔ Aldia Tests Completed\n');
    } catch (error) {
        console.error('✘ Aldia Tests Failed:', error);
    }

    try {
        console.log('--- Running Solex Tests ---');
        await testSolex();
        console.log('✔ Solex Tests Completed\n');
    } catch (error) {
        console.error('✘ Solex Tests Failed:', error);
    }

    try {
        console.log('--- Running Coordinadora Tests ---');
        await testCoordinadora();
        console.log('✔ Coordinadora Tests Completed\n');
    } catch (error) {
        console.error('✘ Coordinadora Tests Failed:', error);
    }

    console.log('=== All tests finished ===');
}

runAllTests();
