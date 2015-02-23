var Padic = Padic || {};

Padic.InitShape = function( shape )
{
    shape.points = [];
    shape.indices = [];
    shape.colors = [];
}

Padic.TwoAdic = function()
{
    scene = {};
    scene.shape1 = {};
    scene.shape2 = {};
    scene.shape3 = {};
    scene.shape4 = {};
    Padic.InitShape( scene.shape1 );
    Padic.InitShape( scene.shape2 );
    Padic.InitShape( scene.shape3 );
    Padic.InitShape( scene.shape4 );

    var n = 50;
    var angleInc = Math.PI / ( n - 1 );

    var r = 0.975;
    //var r = 1;

    var angle = 0;
    for( var i=0; i<2*n-1; i++ )
    {
        scene.shape1.points.push( [ Math.cos( angle ), Math.sin( angle ), 0, 0 ] );
        scene.shape1.colors.push( [ 0.0, 0.0, 0.0, 1.0 ] );
        scene.shape1.indices.push( [ i ] );

        scene.shape4.points.push( [ Math.cos( angle ), Math.sin( angle ), 0, 0 ] );
        scene.shape4.colors.push( [ 0.0, 0.0, 0.0, 1.0 ] );
        scene.shape4.indices.push( [ i ] );
        angle += angleInc;
    }
    scene.shape4.points.push( [ -1, 0, 0, 0 ] );
    scene.shape4.colors.push( [ 0.0, 0.0, 0.0, 1.0 ] );
    scene.shape4.indices.push( [ 2*n-1 ] );

    angle = 0;
    for( var i=0; i<n; i++ )
    {
        scene.shape2.points.push( [ r*Math.cos( angle ), r*Math.sin( angle ), 0, 0 ] );
        scene.shape2.colors.push( [ 1.0, 1.0, 1.0, 1.0 ] );
        scene.shape2.indices.push( [ i ] );
        angle += angleInc;
    }

    angle = Math.PI;
    for( var i=0; i<n; i++ )
    {
        scene.shape3.points.push( [ r*Math.cos( angle ), r*Math.sin( angle ), 0, 0 ] );
        scene.shape3.colors.push( [ 1.0, 0.0, 0.0, 1.0 ] );
        scene.shape3.indices.push( [ i ] );
        angle += angleInc;
    }

    return scene;
}

/*
var m_levels = 2;

Padic.SetupState = function( scene )
{
    scene.state = [];
    var num = Math.pow( 2, m_levels ) - 1;
    for( var i=0; i<num; i++ )
    {
        scene.state.push( [ 0 ] );
    }
}

Padic.UpdateState = function( scene )
{
    var num = Math.pow( 2, m_levels ) - 1;
    for( var i=0; i<num; i++ )
    {
        scene.state[i][0] = scene.state[i][0] == 0 ? 1 : 0;
    }
}
*/