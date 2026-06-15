import { describe as nodeDescribe, it as nodeIt } from "node:test";

let currentSuite = null;

const runAll = async (callbacks) => {
  for (const callback of callbacks) {
    await callback();
  }
};

const normalizeArgs = (args) => {
  if (typeof args[1] === "function") {
    return {
      name: args[0],
      options: undefined,
      fn: args[1],
    };
  }

  return {
    name: args[0],
    options: args[1],
    fn: args[2],
  };
};

const createSuite = () => ({
  afterEachCallbacks: [],
  afterCallbacks: [],
  beforeCallbacks: [],
  beforeRan: false,
});

const describe = (...args) => {
  const { name, options, fn } = normalizeArgs(args);

  return nodeDescribe(name, options, () => {
    const parentSuite = currentSuite;
    const suite = createSuite();
    currentSuite = suite;
    fn();
    currentSuite = parentSuite;
  });
};

const it = (...args) => {
  const { name, options, fn } = normalizeArgs(args);
  const suite = currentSuite;

  return nodeIt(name, options, async () => {
    if (suite && !suite.beforeRan) {
      suite.beforeRan = true;
      await runAll(suite.beforeCallbacks);
    }

    try {
      await fn();
    } finally {
      if (suite) {
        await runAll(suite.afterEachCallbacks);
        await runAll(suite.afterCallbacks);
        suite.afterCallbacks = [];
      }
    }
  });
};

const before = (callback) => {
  if (currentSuite) {
    currentSuite.beforeCallbacks.push(callback);
    return;
  }

  callback();
};

const after = (callback) => {
  if (currentSuite) {
    currentSuite.afterCallbacks.push(callback);
  }
};

const afterEach = (callback) => {
  if (currentSuite) {
    currentSuite.afterEachCallbacks.push(callback);
  }
};

const restoreCallbacks = [];

const mock = {
  method(object, property, implementation) {
    const descriptor = Object.getOwnPropertyDescriptor(object, property);
    const original = object[property];
    const calls = [];

    const replacement = function mockedMethod(...args) {
      calls.push({ arguments: args, this: this });
      return implementation.apply(this, args);
    };

    const restore = () => {
      if (descriptor) {
        Object.defineProperty(object, property, descriptor);
      } else {
        object[property] = original;
      }
    };

    replacement.mock = {
      callCount: () => calls.length,
      calls,
      restore,
    };

    Object.defineProperty(object, property, {
      configurable: true,
      value: replacement,
      writable: true,
    });

    restoreCallbacks.push(restore);
    return replacement;
  },
  restoreAll() {
    while (restoreCallbacks.length) {
      restoreCallbacks.pop()();
    }
  },
};

export { after, afterEach, before, describe, it, mock };
