import { GeometryData } from "./GeometryData";

/**
 * A class that parses geometries of CityJSON and creates lists of vertices and
 * other data arrays to be used in `three.js` meshes.
 *
 * @example
 * // Initialise the class passing the CityJSON file
 * const parser = GeometryParser( citymodel, objIds, objectColors )
 * 
 * // We assume that objId, geom and geomIdx are set
 * parser.parse( geom, objId, geomIdx );
 * 
 * // Then this retrieves the geometry data that were parsed so far
 * const geometryData = parser.geomData;
 */
export class TriangleParser {

    geomData : GeometryData

    constructor( json: Object, objectIds: Number[], objectColors: Object );

    clean() : void;

    /**
     * Parses the `geom` object.
     */ 
    parse( geom: Object, objectId: String, geomIdx: Number ): void;

}