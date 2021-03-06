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
exports.Ioc = void 0;
const Fakes_1 = require("./Fakes");
const Bindings_1 = require("./Bindings");
const Injector_1 = require("./Injector");
const Resolver_1 = require("../Resolver");
const ImportAliases_1 = require("./ImportAliases");
const helpers_1 = require("../helpers");
const IocProxy_1 = require("./IocProxy");
class Ioc {
    constructor() {
        this.fakes = new Fakes_1.Fakes(this);
        this.bindings = new Bindings_1.Bindings(this);
        this.injector = new Injector_1.Injector(this);
        this.aliases = new ImportAliases_1.ImportAliases(this);
        /**
         * The current state of using proxies
         */
        this.usingProxies = false;
        /**
         * Define the module type for resolving auto import aliases. Defaults
         * to `cjs`
         */
        this.module = 'cjs';
    }
    /**
     * Registered aliases. The key is the alias and value is the
     * absolute directory path
     */
    get importAliases() {
        return this.aliases.list;
    }
    /**
     * Detect if the module export value is an esm module
     */
    isEsm(value) {
        return this.module === 'esm' ? true : helpers_1.isEsm(value);
    }
    /**
     * Wraps object and class to a proxy to enable the fakes
     * API
     */
    wrapAsProxy(namespace, value) {
        /**
         * Wrap objects inside proxy
         */
        if (typeof value === 'object') {
            return new IocProxy_1.IocProxyObject(namespace, value, this.fakes);
        }
        /**
         * Wrap class inside proxy
         */
        if (value instanceof Object) {
            return IocProxy_1.IocProxyClass(namespace, value, this.fakes);
        }
        return value;
    }
    /**
     * Wrap value inside proxy by also inspecting for esm
     * default exports
     */
    wrapEsmModuleAsProxy(namespace, value) {
        /**
         * Wrap the default export of esm modules inside in a proxy and
         * not the entire module
         */
        if (this.isEsm(value)) {
            if (value.default) {
                /**
                 * We should never mutate the actual ESM module object and always clone it first
                 * for abvious reasons that objects are shared by reference
                 */
                const clonedModule = Object.getOwnPropertyNames(value).reduce((result, key) => {
                    result[key] = value[key];
                    return result;
                }, {});
                clonedModule.default = this.wrapAsProxy(namespace, clonedModule.default);
                return clonedModule;
            }
            /**
             * We don't proxy named exports as we don't have a good story on what to proxy
             *
             * - Should we proxy the whole module?
             * - Or should be expose api to allow proxying a selected set of modules
             */
            return value;
        }
        return this.wrapAsProxy(namespace, value);
    }
    /**
     * Makes an instance of a class by injecting dependencies
     */
    makeRaw(value, args) {
        return this.injector.make(value, args || []);
    }
    /**
     * Makes an instance of a class asynchronously by injecting dependencies
     */
    makeRawAsync(value, args) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.injector.makeAsync(value, args || []);
        });
    }
    /**
     * Enable/disable proxies. Proxies are mainly required for fakes to
     * work
     */
    useProxies(enable = true) {
        this.usingProxies = !!enable;
        return this;
    }
    /**
     * Register a binding with a callback. The callback return value will be
     * used when binding is resolved
     */
    bind(binding, callback) {
        helpers_1.ensureIsFunction(callback, '"ioc.bind" expect 2nd argument to be a function');
        this.bindings.register(binding, callback, false);
        return this;
    }
    /**
     * Same as the [[bind]] method, but registers a singleton only. Singleton's callback
     * is invoked only for the first time and then the cached value is used
     */
    singleton(binding, callback) {
        helpers_1.ensureIsFunction(callback, '"ioc.singleton" expect 2nd argument to be a function');
        this.bindings.register(binding, callback, true);
        return this;
    }
    /**
     * Define an import alias
     */
    alias(absolutePath, alias) {
        this.aliases.register(absolutePath, alias);
        return this;
    }
    /**
     * Register a fake for a namespace. Fakes works both for "bindings" and "import aliases".
     * Fakes only work when proxies are enabled using "useProxies".
     */
    fake(namespace, callback) {
        helpers_1.ensureIsFunction(callback, '"ioc.fake" expect 2nd argument to be a function');
        this.fakes.register(namespace, callback);
        return this;
    }
    /**
     * Clear selected or all the fakes. Calling the method with no arguments
     * will clear all the fakes
     */
    restore(namespace) {
        namespace ? this.fakes.delete(namespace) : this.fakes.clear();
        return this;
    }
    /**
     * Find if a fake has been registered for a given namespace
     */
    hasFake(namespace) {
        return this.fakes.has(namespace);
    }
    /**
     * Find if a binding exists for a given namespace
     */
    hasBinding(namespace) {
        return this.bindings.has(namespace);
    }
    /**
     * Find if a namespace is part of the auto import aliases. Returns false, when namespace
     * is an alias path but has an explicit binding too
     */
    isAliasPath(namespace) {
        if (this.bindings.has(namespace)) {
            return false;
        }
        return this.aliases.has(namespace);
    }
    /**
     * Lookup a namespace. The output contains the complete namespace,
     * along with its type. The type is an "alias" or a "binding".
     *
     * Null is returned when unable to lookup the namespace inside the container
     *
     * Note: This method just checks if a namespace is registered or binding
     *      or can be it resolved from auto import aliases or not. However,
     *      it doesn't check for the module existence on the disk.
     *
     * Optionally you can define a prefix namespace
     * to be used to build the complete namespace. For example:
     *
     * - namespace: UsersController
     * - prefixNamespace: App/Controllers/Http
     * - Output: App/Controllers/Http/UsersController
     *
     * Prefix namespace is ignored for absolute namespaces. For example:
     *
     * - namespace: /App/UsersController
     * - prefixNamespace: App/Controllers/Http
     * - Output: App/UsersController
     */
    lookup(namespace, prefixNamespace) {
        if (typeof namespace !== 'string' && namespace['namespace'] && namespace['type']) {
            return namespace;
        }
        /**
         * Ensure namespace is defined as a string only
         */
        if (typeof namespace !== 'string') {
            throw new Error('IocLookupException');
        }
        /**
         * Build complete namespace
         */
        if (namespace.startsWith('/')) {
            namespace = namespace.substr(1);
        }
        else if (prefixNamespace) {
            namespace = `${prefixNamespace.replace(/\/$/, '')}/${namespace}`;
        }
        /**
         * Namespace is a binding
         */
        if (this.hasBinding(namespace)) {
            return {
                type: 'binding',
                namespace: namespace,
            };
        }
        /**
         * Namespace is an alias
         */
        if (this.isAliasPath(namespace)) {
            return {
                type: 'alias',
                namespace: namespace,
            };
        }
        return null;
    }
    /**
     * Same as [[lookup]]. But raises exception instead of returning null
     */
    lookupOrFail(namespace, prefixNamespace) {
        const lookupNode = this.lookup(namespace, prefixNamespace);
        if (!lookupNode) {
            throw new Error('IocLookupException');
        }
        return lookupNode;
    }
    /**
     * Resolve a binding by invoking the binding factory function. An exception
     * is raised, if the binding namespace is unregistered.
     */
    resolveBinding(binding) {
        if (this.trapCallback) {
            return this.trapCallback(binding);
        }
        const value = this.bindings.resolve(binding);
        if (this.usingProxies) {
            return this.wrapAsProxy(binding, value);
        }
        return value;
    }
    /**
     * Import namespace from the auto import aliases. This method assumes you are
     * using native ES modules
     */
    import(namespace) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.trapCallback) {
                return this.trapCallback(namespace);
            }
            const value = yield this.aliases.resolveAsync(namespace);
            if (this.usingProxies) {
                return this.wrapEsmModuleAsProxy(namespace, value);
            }
            return value;
        });
    }
    /**
     * Same as the "import" method, but uses CJS for requiring the module from its
     * path
     */
    require(namespace) {
        if (this.trapCallback) {
            return this.trapCallback(namespace);
        }
        const value = this.aliases.resolve(namespace);
        if (this.usingProxies) {
            return this.wrapEsmModuleAsProxy(namespace, value);
        }
        return value;
    }
    /**
     * The use method looks up a namespace inside both the bindings and the
     * auto import aliases
     */
    use(namespace) {
        if (this.trapCallback) {
            return this.trapCallback(typeof namespace === 'string' ? namespace : namespace['namespace']);
        }
        const lookupNode = this.lookupOrFail(namespace);
        if (lookupNode.type === 'alias') {
            return this.require(lookupNode.namespace);
        }
        return this.resolveBinding(lookupNode.namespace);
    }
    /**
     * Same as the [[use]] method, but instead uses ES modules for resolving
     * the auto import aliases
     */
    useAsync(namespace) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.trapCallback) {
                return this.trapCallback(typeof namespace === 'string' ? namespace : namespace['namespace']);
            }
            const lookupNode = this.lookupOrFail(namespace);
            if (lookupNode.type === 'alias') {
                return this.import(lookupNode.namespace);
            }
            return this.resolveBinding(lookupNode.namespace);
        });
    }
    /**
     * Makes an instance of the class by first resolving it.
     */
    make(namespace, args) {
        const isContainerNamespace = typeof namespace === 'string' || (namespace['namespace'] && namespace['type']);
        /**
         * Value is not a container namespace or a lookup
         * node
         */
        if (!isContainerNamespace) {
            return this.makeRaw(namespace, args);
        }
        /**
         * Invoke trap callback (if registered)
         */
        if (this.trapCallback) {
            return this.trapCallback(typeof namespace === 'string' ? namespace : namespace['namespace']);
        }
        const lookupNode = this.lookupOrFail(namespace);
        /**
         * We do not touch bindings at all. The factory function
         * return value is used as it is
         */
        if (lookupNode.type === 'binding') {
            return this.resolveBinding(lookupNode.namespace);
        }
        const value = this.require(lookupNode.namespace);
        /**
         * We attempt to make an instance of only the export
         * default of a ES module
         */
        if (this.isEsm(value) && value.default) {
            return this.makeRaw(value.default, args || []);
        }
        return this.makeRaw(value, args);
    }
    /**
     * Same as the [[make]] method, but instead uses ES modules for resolving
     * the auto import aliases
     */
    makeAsync(namespace, args) {
        return __awaiter(this, void 0, void 0, function* () {
            const isContainerNamespace = typeof namespace === 'string' || (namespace['namespace'] && namespace['type']);
            /**
             * Value is not a container namespace or a lookup
             * node
             */
            if (!isContainerNamespace) {
                return this.makeRawAsync(namespace, args);
            }
            /**
             * Invoke trap callback (if registered)
             */
            if (this.trapCallback) {
                return this.trapCallback(typeof namespace === 'string' ? namespace : namespace['namespace']);
            }
            const lookupNode = this.lookupOrFail(namespace);
            /**
             * We do not touch bindings at all. The factory function
             * return value is used as it is
             */
            if (lookupNode.type === 'binding') {
                return this.resolveBinding(lookupNode.namespace);
            }
            const value = yield this.import(lookupNode.namespace);
            /**
             * We attempt to make an instance of only the export
             * default of a ES module
             */
            if (this.isEsm(value) && value.default) {
                return this.makeRawAsync(value.default, args || []);
            }
            return this.makeRawAsync(value, args);
        });
    }
    /**
     * Define a callback to be called when all of the container
     * bindings are available.
     *
     * Note: This method is exclusive for bindings and doesn't resolve
     * auto import aliases
     */
    withBindings(namespaces, cb) {
        if (namespaces.every((namespace) => this.hasBinding(namespace))) {
            /**
             * The callback accepts a tuple, whereas map returns an array. So we
             * need to cast the value to any by hand
             */
            cb(...namespaces.map((namespace) => this.resolveBinding(namespace)));
        }
    }
    /**
     * @deprecated: Use "withBindings" instead
     */
    with(namespaces, cb) {
        process.emitWarning('DeprecationWarning', 'container.with() is deprecated. Use container.withBindings() instead');
        return this.withBindings(namespaces, cb);
    }
    /**
     * Call method on an object and automatically resolve its depdencies
     */
    call(target, method, args) {
        if (typeof target[method] !== 'function') {
            throw new Error(`Missing method "${method}" on "${target.constructor.name}"`);
        }
        return this.injector.call(target, method, args || []);
    }
    /**
     * Same as [[call]], but uses ES modules for resolving the auto
     * import aliases
     */
    callAsync(target, method, args) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof target[method] !== 'function') {
                throw new Error(`Missing method "${method}" on "${target.constructor.name}"`);
            }
            return this.injector.callAsync(target, method, args || []);
        });
    }
    /**
     * Trap container lookup calls. It includes
     *
     * - Ioc.use
     * - Ioc.useAsync
     * - Ioc.make
     * - Ioc.makeAsync
     * - Ioc.require
     * - Ioc.import
     * - Ioc.resolveBinding
     */
    trap(callback) {
        this.trapCallback = callback;
        return this;
    }
    /**
     * Returns the resolver instance to resolve Ioc container bindings with
     * little ease. Since, the IocResolver uses an in-memory cache to
     * improve the lookup speed, we suggest keeping a reference to
     * the output of this method to leverage caching
     */
    getResolver(fallbackMethod, rcNamespaceKey, fallbackNamespace) {
        return new Resolver_1.IocResolver(this, fallbackMethod, rcNamespaceKey, fallbackNamespace);
    }
}
exports.Ioc = Ioc;
