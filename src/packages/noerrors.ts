import type {TexPackage} from './types.js';
export default {
  name: 'noerrors', commands: {}, environments: {},
  configurationModules: ['input/tex/noerrors/NoErrorsConfiguration.js'],
  formatError(message, tex) {
    return {kind:'merror', attributes:{'data-mjx-error':message, title:message}, text:'', start:0,
      children:[{kind:'mtext', attributes:{}, children:[], text:tex.replace(/\n/g,' '), start:0}]};
  },
} satisfies TexPackage;
