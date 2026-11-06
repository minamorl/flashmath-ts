import test from 'node:test';
import {packageFixtures} from './fixtures.mjs';
test('bussproofs: original conformance fixtures',t=>packageFixtures(t,'Bussproofs'));
