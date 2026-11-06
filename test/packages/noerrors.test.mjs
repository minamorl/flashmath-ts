import test from 'node:test';
import {packageFixtures} from './fixtures.mjs';
test('noerrors: original conformance fixtures',t=>packageFixtures(t,'Noerrors'));
