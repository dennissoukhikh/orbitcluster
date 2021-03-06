import { common } from './common';
import { Options } from './contracts';

export const buildURL = (opt: Options) => {
    const options = opt;

    if (!options) {
        throw new Error(`'options' undefined`);
    }

    if (!options.class) {
        throw new Error(`'options.class' undefined`);
    }

    if (!options.emptyresult) {
        options.emptyresult = 'show';
    }

    if (!options.metadata) {
        options.metadata = true;
    }

    if (!options.format) {
        options.format = 'json';
    }

    // Controller
    if (!options.controller || common.api.controllers.indexOf(options.controller) === -1) {
        options.controller = 'basicspacedata';
    }

    // Action
    if (!options.action || common.api.actions.indexOf(options.action) === -1) {
        options.action = 'query';
    }

    if (common.api.classes.indexOf(options.class) === -1) {
        throw new Error('The request class is not supported');
    }

    let url = `/${options.controller}/${options.action}/class/${options.class}`;

    // Create the query
    if (options.query) {
        if (!Array.isArray(options.query)) {
            options.query = [options.query];
        }

        options.query.forEach((q: any) => {
            if (common.api.fields[options.class].indexOf(q.field) > -1) {
                url += `/${q.field}/${q.condition}`;
            }
        });
    }

    // Predicates
    if (options.predicates && options.predicates.length > 0) {
        if (!Array.isArray(options.predicates)) {
            options.predicates = [options.predicates];
        }

        options.predicates = options.predicates.filter((p) => {
            const isValid = common.api.fields[options.class].indexOf(p) > -1;

            if (!isValid) {
                throw new Error(`${p} is not a valid predicate for ${options.class}`);
            }

            return isValid;
        });

        url += `/predicates/${options.predicates.join()}`;
    }

    // Favorites
    if (options.favorites && options.favorites.length > 0) {
        if (!Array.isArray(options.favorites)) {
            options.favorites = [options.favorites];
        }

        url += `/favorites/${options.favorites.join()}`;
    }

    // orderby - must be array ['+OBJECT_NAME','-ORDINAL']
    if (options.orderby && options.orderby.length > 0) {
        if (!Array.isArray(options.orderby)) {
            options.orderby = [options.orderby];
        }

        options.orderby = options.orderby.filter((p) => {
            const predicate = p.slice(Math.floor((p[0] === '+') ? 1 : 0 || (p[0] === '-') ? 1 : 0));
            const isValid = common.api.fields[options.class].indexOf(predicate) > -1;

            if (!isValid) {
                throw new Error(`${p} is not a valid predicate for ${options.class}`);
            }

            return isValid;
        });

        url += `/orderby/${options.orderby.map((o) => {
            return `${o.slice(Math.floor((o[0] === '+') ? 1 : 0 || (o[0] === '-') ? 1 : 0))}%20${o[0] === '-' ? 'desc' : 'asc'}`;
        }).join()}`;
    }

    // Limit and offset
    if (Number.isFinite(options.limit) || Number.isFinite(options.offset)) {
        if (!Number.isFinite(options.offset)) options.offset = 0;
        if (!Number.isFinite(options.limit)) options.limit = 100;

        url += `/limit/${options.limit},${options.offset}`;
    }

    // Distinct
    if (options.distinct) {
        url += '/distinct/true';
    }

    // Metadata
    if (options.metadata) {
        url += '/metadata/true';
    }

    // emptyresult
    if (options.emptyresult === 'show') {
        url += '/emptyresult/show';
    }

    // format
    if (common.api.formats.indexOf(options.format) > -1) {
        url += `/format/${options.format}`;
    }

    return url;
}
