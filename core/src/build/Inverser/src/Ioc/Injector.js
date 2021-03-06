"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Injector = void 0;
const helpers_1 = require("../helpers");
/**
 * Exposes the API to injecting dependencies to a class or a method
 */
class Injector {
    constructor(container) {
        this.container = container;
    }
    /**
     * Resolves the injections to be injected to a method or the
     * class constructor
     */
    resolve(targetName, injections, runtimeValues) {
        /**
         * If the runtime values length is greater or same as the length
         * of injections, then we treat them as the source of truth
         * and inject them as it is
         */
        if (runtimeValues.length >= injections.length) {
            return runtimeValues;
        }
        /**
         * Loop over all the injections and give preference to runtime value
         * for a given index, otherwise fallback to `container.make`.
         */
        return injections.map((injection, index) => {
            if (runtimeValues[index] !== undefined) {
                return runtimeValues[index];
            }
            /**
             * Disallow object and primitive constructors
             */
            if (helpers_1.isPrimtiveConstructor(injection)) {
                throw new Error('Invalid Injection Exception' + targetName);
            }
            return this.container.make(injection);
        });
    }
    /**
     * Resolves the injections to be injected to a method or the
     * class constructor
     */
    resolveAsync(targetName, injections, runtimeValues) {
        return __awaiter(this, void 0, void 0, function* () {
            /**
             * If the runtime values length is greater or same as the length
             * of injections, then we treat them as the source of truth
             * and inject them as it is
             */
            if (runtimeValues.length >= injections.length) {
                return runtimeValues;
            }
            /**
             * Loop over all the injections and give preference to runtime value
             * for a given index, otherwise fallback to `container.makeAsync`.
             */
            return Promise.all(injections.map((injection, index) => {
                if (runtimeValues[index] !== undefined) {
                    return runtimeValues[index];
                }
                /**
                 * Disallow object and primitive constructors
                 */
                if (helpers_1.isPrimtiveConstructor(injection)) {
                    throw new Error('InvalidInjectionException' + targetName);
                }
                return this.container.makeAsync(injection);
            }));
        });
    }
    /**
     * Find if the value can be instantiated
     */
    isNewable(target) {
        return (typeof target === 'function' || target instanceof Object) && target.makePlain !== true;
    }
    /**
     * Get injections for a given property from the target
     */
    getInjections(target, prop) {
        return target.hasOwnProperty('inject') ? target.inject[prop] || [] : [];
    }
    /**
     * Inject dependencies to the constructor of the class
     */
    make(target, runtimeValues) {
        if (!this.isNewable(target)) {
            return target;
        }
        return new target(...this.resolve(target.name, this.getInjections(target, 'instance'), runtimeValues));
    }
    /**
     * Inject dependencies asynchronously to the constructor of the class
     */
    makeAsync(target, runtimeValues) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isNewable(target)) {
                return target;
            }
            return new target(...(yield this.resolveAsync(target.name, this.getInjections(target, 'instance'), runtimeValues)));
        });
    }
    /**
     * Injects dependencies to the class method
     */
    call(target, method, runtimeValues) {
        const constructor = target.constructor;
        return target[method](...this.resolve(`${constructor.name}.${method}`, this.getInjections(constructor, method), runtimeValues));
    }
    /**
     * Injects dependencies asynchronously to the class method
     */
    callAsync(target, method, runtimeValues) {
        return __awaiter(this, void 0, void 0, function* () {
            const constructor = target.constructor;
            return target[method](...(yield this.resolveAsync(`${constructor.name}.${method}`, this.getInjections(constructor, method), runtimeValues)));
        });
    }
}
exports.Injector = Injector;
