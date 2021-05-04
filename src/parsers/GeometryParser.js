import {
	Vector3
} from 'three';
import earcut from 'earcut';

import { defaultSemanticsColors } from '../defaults/colors.js';

export class GeometryParser {

	constructor( json, objectIds, objectColors ) {

		this.json = json;

		this.objectIds = objectIds;
		this.objectColors = objectColors;
		this.surfaceColors = defaultSemanticsColors;

		this.meshVertices = [];
		this.meshObjIds = [];
		this.meshObjType = [];
		this.meshSemanticSurfaces = [];

	}

	clean() {

		this.meshVertices = [];
		this.meshObjIds = [];
		this.meshObjType = [];
		this.meshSemanticSurfaces = [];

	}

	parseGeometry( geometry, objectId ) {

		const geomType = geometry.type;

		const semanticSurfaces = geometry.semantics ? geometry.semantics.surfaces : [];

		if ( geomType == "Solid" ) {

			const shells = geometry.boundaries;

			for ( let i = 0; i < shells.length; i ++ ) {

				const semantics = geometry.semantics ? geometry.semantics.values[ i ] : [];

				this.parseShell( shells[ i ], objectId, semantics, semanticSurfaces );

			}

		} else if ( geomType == "MultiSurface" || geomType == "CompositeSurface" ) {

			const surfaces = geometry.boundaries;

			const semantics = geometry.semantics ? geometry.semantics.values : [];
			this.parseShell( surfaces, objectId, semantics, semanticSurfaces );

		} else if ( geomType == "MultiSolid" || geomType == "CompositeSolid" ) {

			const solids = geometry.boundaries;

			for ( let i = 0; i < solids.length; i ++ ) {

				for ( let j = 0; j < solids[ i ].length; j ++ ) {

					const semantics = geometry.semantics ? geometry.semantics.values[ i ][ j ] : [];

					this.parseShell( solids[ i ][ j ], objectId, semantics, semanticSurfaces );

				}

			}

		}

	}

	parseShell( boundaries, objectId, semantics = [], surfaces = [] ) {

		const vertices = this.meshVertices;
		const objIds = this.meshObjIds;
		const objTypes = this.meshObjType;
		const semanticTypes = this.meshSemanticSurfaces;

		const json = this.json;

		const idIdx = this.objectIds.indexOf( objectId );

		// TODO: If not found, it should be appended
		const objType = Object.keys( this.objectColors ).indexOf( json.CityObjects[ objectId ].type );

		// Contains the boundary but with the right verticeId
		for ( let i = 0; i < boundaries.length; i ++ ) {

			let boundary = [];
			let holes = [];

			let surfaceType = - 1;
			if ( semantics.length > 0 ) {

				const surfaceTypeName = surfaces[ semantics[ i ] ].type;

				surfaceType = Object.keys( this.surfaceColors ).indexOf( surfaceTypeName );

				if ( surfaceType < 0 ) {

					surfaceType = Object.keys( this.surfaceColors ).length;
					this.surfaceColors[ surfaceTypeName ] = Math.floor( Math.random() * 0xffffff );

				}

			}

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

					vertices.push( boundary[ n ] );
					objIds.push( idIdx );
					objTypes.push( objType );
					semanticTypes.push( surfaceType );

				}


			} else if ( boundary.length > 3 ) {

				//create list of points
				let pList = [];
				for ( let k = 0; k < boundary.length; k ++ ) {

					pList.push( {
						x: json.vertices[ boundary[ k ] ][ 0 ],
						y: json.vertices[ boundary[ k ] ][ 1 ],
						z: json.vertices[ boundary[ k ] ][ 2 ]
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
						vertices.push( vertex );
						objIds.push( idIdx );
						objTypes.push( objType );
						semanticTypes.push( surfaceType );

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
