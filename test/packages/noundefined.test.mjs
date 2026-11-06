import test from 'node:test';
import {packageFixtures} from './fixtures.mjs';
test('noundefined: original conformance fixtures',t=>packageFixtures(t,'Noundefined'));
