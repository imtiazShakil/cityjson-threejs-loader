import {
	Vector3
} from 'three';
import earcut from 'earcut';

import { TRIANGLES, GeometryData } from './GeometryData.js';
import { BaseParser } from './BaseParser.js';

export class TriangleParser extends BaseParser {

	constructor( json, objectIds, objectColors ) {

		super( json, objectIds, objectColors );

		this.geomData = new GeometryData( TRIANGLES );

	}

	clean() {

		this.geomData = new GeometryData( TRIANGLES );

	}

	parseGeometry( geometry, objectId, geomIdx ) {

		const geomType = geometry.type;

		const semanticSurfaces = geometry.semantics ? geometry.semantics.surfaces : [];

		if ( geomType == "Solid" ) {

			const shells = geometry.boundaries;

			for ( let i = 0; i < shells.length; i ++ ) {

				const semantics = geometry.semantics ? geometry.semantics.values[ i ] : [];

				this.parseShell( shells[ i ], objectId, geomIdx, semantics, semanticSurfaces );

			}

		} else if ( geomType == "MultiSurface" || geomType == "CompositeSurface" ) {

			const surfaces = geometry.boundaries;

			const semantics = geometry.semantics ? geometry.semantics.values : [];
			this.parseShell( surfaces, objectId, geomIdx, semantics, semanticSurfaces );

		} else if ( geomType == "MultiSolid" || geomType == "CompositeSolid" ) {

			const solids = geometry.boundaries;

			for ( let i = 0; i < solids.length; i ++ ) {

				for ( let j = 0; j < solids[ i ].length; j ++ ) {

					const semantics = geometry.semantics ? geometry.semantics.values[ i ][ j ] : [];

					this.parseShell( solids[ i ][ j ], objectId, geomIdx, semantics, semanticSurfaces );

				}

			}

		}

	}

	parseShell( boundaries, objectId, geomIdx, semantics = [], surfaces = [] ) {

		const cityObj = this.json.CityObjects[ objectId ];

		const idIdx = this.getObjectIdx( objectId );

		const objType = this.getObjectTypeIdx( cityObj.type );

		const lodIdx = this.getLodIndex( cityObj.geometry[ geomIdx ].lod );

		// Contains the boundary but with the right verticeId
		for ( let i = 0; i < boundaries.length; i ++ ) {

			let boundary = [];
			let holes = [];

			const surfaceType = this.getSurfaceTypeIdx( i, semantics, surfaces );

			for ( let j = 0; j < boundaries[ i ].length; j ++ ) {

				if ( boundary.length > 0 ) {

					holes.push( boundary.length );

				}

				// const new_boundary = this.extractLocalIndices( geom, boundaries[ i ][ j ], vertices, json );
				// boundary.push( ...new_boundary );
				boundary.push( ...boundaries[ i ][ j ] );

			}

			if ( boundary.length == 3 ) {

				for ( let n = 0; n < 3; n ++ ) {

					this.geomData.addVertex( boundary[ n ],
											 idIdx,
											 objType,
											 surfaceType,
											 geomIdx,
											 i,
											 lodIdx );

				}


			} else if ( boundary.length > 3 ) {

				//create list of points
				let pList = [];
				for ( let k = 0; k < boundary.length; k ++ ) {

					pList.push( {
						x: this.json.vertices[ boundary[ k ] ][ 0 ],
						y: this.json.vertices[ boundary[ k ] ][ 1 ],
						z: this.json.vertices[ boundary[ k ] ][ 2 ]
					} );

				}

				//get normal of these points
				const normal = this.getNewellsNormal( pList );

				//convert to 2d (for triangulation)
				let pv = [];
				for ( let k = 0; k < pList.length; k ++ ) {

					const re = this.to_2d( pList[ k ], normal );
					pv.push( re.x );
					pv.push( re.y );

				}

				//triangulate
				const tr = earcut( pv, holes, 2 );

				// create faces based on triangulation
				for ( let k = 0; k < tr.length; k += 3 ) {

					for ( let n = 0; n < 3; n ++ ) {

						const vertex = boundary[ tr[ k + n ] ];

						this.geomData.addVertex( vertex,
											 	 idIdx,
												 objType,
												 surfaceType,
												 geomIdx,
												 i,
												 lodIdx );

					}

				}

			}

		}

	}

	getNewellsNormal( indices ) {

		// find normal with Newell's method
		let n = [ 0.0, 0.0, 0.0 ];

		for ( let i = 0; i < indices.length; i ++ ) {

			let nex = i + 1;

			if ( nex == indices.length ) {

				nex = 0;

			}

			n[ 0 ] = n[ 0 ] + ( ( indices[ i ].y - indices[ nex ].y ) * ( indices[ i ].z + indices[ nex ].z ) );
			n[ 1 ] = n[ 1 ] + ( ( indices[ i ].z - indices[ nex ].z ) * ( indices[ i ].x + indices[ nex ].x ) );
			n[ 2 ] = n[ 2 ] + ( ( indices[ i ].x - indices[ nex ].x ) * ( indices[ i ].y + indices[ nex ].y ) );

		}

		let b = new Vector3( n[ 0 ], n[ 1 ], n[ 2 ] );
		return ( b.normalize() );

	}

	to_2d( p, n ) {

		p = new Vector3( p.x, p.y, p.z );
		let x3 = new Vector3( 1.1, 1.1, 1.1 );
		if ( x3.distanceTo( n ) < 0.01 ) {

			x3.add( new Vector3( 1.0, 2.0, 3.0 ) );

		}

		let tmp = x3.dot( n );
		let tmp2 = n.clone();
		tmp2.multiplyScalar( tmp );
		x3.sub( tmp2 );
		x3.normalize();
		let y3 = n.clone();
		y3.cross( x3 );
		let x = p.dot( x3 );
		let y = p.dot( y3 );
		let re = { x: x, y: y };
		return re;

	}

}