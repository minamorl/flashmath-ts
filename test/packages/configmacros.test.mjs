import test from 'node:test';
import {packageFixtures} from './fixtures.mjs';
test('configmacros: original conformance fixtures',t=>packageFixtures(t,'ConfigMacros'));
