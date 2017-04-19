/**
  The "common" component contains elements common to all three modes
  (recorder, player, sandbox).
*/

import MainView from './main_view';
import fullscreen  from './fullscreen';
import buffers from '../buffers/index';
import errors from './errors';
import resize from './resize';
import examples from './examples';

export default function (bundle) {

  // Sent when the application initializes.
  bundle.defineAction('init', 'System.Init');

  bundle.include(MainView);
  bundle.include(fullscreen);
  bundle.include(buffers);
  bundle.include(errors);
  bundle.include(resize);
  bundle.include(examples);

};

export const interpretQueryString = function (store, scope, qs) {
  const stepperOptions = {
    showStepper: true,
    showStack: true,
    showViews: true,
    showIO: true
  };
  (qs.stepperControls||'').split(',').forEach(function (controlStr) {
    // No prefix to highlight, '-' to disable.
    const m = /^(-)?(.*)$/.exec(controlStr);
    if (m) {
      stepperOptions[m[2]] = m[1] || '+';
    }
  });
  if ('noStepper' in qs) {
    stepperOptions.showStepper = false;
    stepperOptions.showStack = false;
    stepperOptions.showViews = false;
    stepperOptions.showIO = false;
  }
  if ('noStack' in qs) {
    stepperOptions.showStack = false;
  }
  if ('noViews' in qs) {
    stepperOptions.showViews = false;
  }
  if ('noIO' in qs) {
    stepperOptions.showIO = false;
  }
  store.dispatch({type: scope.stepperConfigure, options: stepperOptions});

  if ('source' in qs) {
    store.dispatch({type: scope.sourceLoad, text: qs.source||''});
  }

  if ('input' in qs) {
    store.dispatch({type: scope.inputLoad, text: qs.input||''});
  }

  if ('token' in qs) {
    store.dispatch({type: scope.uploadTokenChanged, token: qs.token});
  }

};
