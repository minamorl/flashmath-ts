import type {TexPackage} from './types.js';
/** Harness compatibility: a synchronous parse never needs the upstream loader retry. */
export default {name:'retry', commands:{retry:{execute(){}}},environments:{}} satisfies TexPackage;
