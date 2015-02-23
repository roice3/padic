tdl.require('tdl.buffers');
tdl.require('tdl.fast');
tdl.require('tdl.fps');
tdl.require('tdl.log');
tdl.require('tdl.math');
tdl.require('tdl.models');
tdl.require('tdl.primitives');
tdl.require('tdl.programs');
tdl.require('tdl.webgl');
window.onload = initialize;

// globals
var gl;                   // the gl context.
var canvas;               // the canvas
var math;                 // the math lib.
var fast;                 // the fast math lib.

var g_eyeRadius = 6;

function CreateApp()
{
    window.addEventListener( 'keydown', handleKeyDown, false );
    window.addEventListener( 'keyup', handleKeyUp, false );
    canvas.onmousedown = handleMouseDown;
    document.onmouseup = handleMouseUp;
    //document.onmousemove = handleMouseMove;

    function handleKeyDown( event )
    {
        if( event.keyCode == 38 ) // Up
        { 
            m_state.incrementLevels();
        }

        if( event.keyCode == 40 ) // Down
        { 
            m_state.decrementLevels();
        }
    }
    
    function handleKeyUp( event )
    {
    }

    function zoom( delta )
    {
        if ( g_eyeRadius >= delta )
            g_eyeRadius = g_eyeRadius - delta;
    }
    
    function wheel(event)
    {
        var delta = 0;
        if (!event) event = window.event;
        if (event.wheelDelta) {
            delta = event.wheelDelta/120; 
        } else if (event.detail) {
            delta = -event.detail/3;
        }
        if (delta)
            zoom( delta * 3 );
        if (event.preventDefault)
                event.preventDefault();
        event.returnValue = false;
    }
    
    /* Initialization code. */
    if( window.addEventListener )
        window.addEventListener( 'DOMMouseScroll', wheel, false );
    //window.onmousewheel = document.onmousewheel = wheel;

    var model = {};
    var newInstances = [];
    var models = [];
    
    // pre-allocate a bunch of arrays
    var projection = new Float32Array(16);
    var view = new Float32Array(16);
    var viewProjection = new Float32Array(16);
    var worldViewProjection = new Float32Array(16);
    var mvMatrix = new Float32Array(16);
    var eyePosition = new Float32Array(3);
    var target = new Float32Array(3);
    var up = new Float32Array([0,1,0]);

    var m_state = new Padic.State();

    function degToRad(degrees) {
        return degrees * Math.PI / 180;
    }

    var m_continuousMode = false;
    var m_twist = false;
    var m_twistAngle = 0;
    var m_twistInc = Math.PI/75;

    var mouseDown = false;
    var lastMouseX = null;
    var lastMouseY = null;

    function handleMouseDown(event)
    {
        mouseDown = true;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }

    function handleMouseUp(event)
    {
        mouseDown = false;

        // Click.
        m_continuousMode = !m_twist;
        m_twist = true;
    }

    function handleMouseMove(event)
    {
        if( !mouseDown )
          return;

        var newX = event.clientX;
        var newY = event.clientY;
        var deltaX = newX - lastMouseX;
        var deltaY = newY - lastMouseY;

        /*
        var shiftDown = event.shiftKey;
        var altKey = event.altKey;
        var normalDrag = !(shiftDown || altKey );
        var generalDrag = (shiftDown && altKey );
        if( generalDrag )
            m_rotationHandler.MouseDraggedGeneral( deltaX, -deltaY );
        else
            m_rotationHandler.MouseDraggedTorus( deltaX, -deltaY, normalDrag, shiftDown, altKey );
        */

        lastMouseX = newX
        lastMouseY = newY;
    }

    var fragmentShaderSrc;
    var vertexShaderSrc;
    var scene;

    function handleFragmentShader(src)
    {
        fragmentShaderSrc = src;
        finishLoading();
    }

    function handleVertexShader(src)
    {
        vertexShaderSrc = src;
        finishLoading();
    }

    function startLoading()
    {
        scene = Padic.TwoAdic();
        m_state.initState();

        var fsrequest = new XMLHttpRequest();
        fsrequest.open( "GET", "padic-fragment-shader.glsl" );
        fsrequest.onreadystatechange = function () {
            if ( fsrequest.readyState == 4 ) {
                handleFragmentShader( fsrequest.responseText );
            }
        }
        fsrequest.send();

        var vsrequest = new XMLHttpRequest();
        vsrequest.open( "GET", "padic-vertex-shader.glsl" );
        vsrequest.onreadystatechange = function () {
            if (vsrequest.readyState == 4) {
                handleVertexShader( vsrequest.responseText );
            }
        }
        vsrequest.send();
    }

    function handleLoadedScene( loadedScene )
    {
        scene = loadedScene;
        finishLoading();
    }

    function setupGeometry( shape )
    {   
        var positions = new tdl.primitives.AttribBuffer( 4, shape.points.length );
        for( var ii = 0; ii < shape.points .length; ++ii )
            positions.push( shape.points[ ii ] );

        var indices = new tdl.primitives.AttribBuffer( 1, shape.indices.length, 'Uint16Array' );
        for( var ii = 0; ii < shape.indices.length; ++ii )
            indices.push( shape .indices[ ii ] );

        var colors = new tdl.primitives.AttribBuffer( 4, shape.colors.length );
        for( var ii = 0; ii < shape.colors.length; ++ii )
            colors.push( shape .colors[ ii ] );

        var geometry = {
            position : positions,
            indices : indices,
            color : colors,
        };

        return geometry;
    }

    function finishLoading()
    {
        if( vertexShaderSrc == null || fragmentShaderSrc == null || scene == null )
            return;

        // Create Shader Program
        scene.program = tdl.programs.loadProgram( vertexShaderSrc, fragmentShaderSrc );

		if( !scene.background )
            scene.background = [ 0.9, 0.9, 0.9 ];
		
        scene.uniforms = {
            worldViewProjection: worldViewProjection,
            mvMatrix: mvMatrix,
            twist: m_twistAngle
        };

        scene.models = [
            new tdl.models.Model( scene.program, setupGeometry( scene.shape1 ), null, gl.TRIANGLE_FAN ),
            new tdl.models.Model( scene.program, setupGeometry( scene.shape2 ), null, gl.TRIANGLE_FAN ),
            new tdl.models.Model( scene.program, setupGeometry( scene.shape3 ), null, gl.TRIANGLE_FAN ),
            new tdl.models.Model( scene.program, setupGeometry( scene.shape4 ), null, gl.LINE_STRIP ) 
        ];
    }
  
    function modelIsReady()
    {
        return scene && scene.models;
    }

    function render( elapsedTime )
    {
        canvas.clientWidth  = window.innerWidth;
        canvas.clientHeight = window.innerHeight;

        var m4 = fast.matrix4;
        var aspectRatio = canvas.clientWidth / canvas.clientHeight;
        
        // clear the screen.
        gl.colorMask(true, true, true, true);
        gl.depthMask(true);
        gl.clearColor( scene.background[0], scene.background[1], scene.background[2], 0 );
        gl.clearDepth(1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
        
        gl.disable( gl.CULL_FACE );
        gl.disable( gl.DEPTH_TEST );

        // Doesn't work on Windows, because of ANGLE.
        gl.lineWidth( 3.0 );

        // Compute a projection and view matrices.
        m4.perspective( projection, math .degToRad( 20 ), aspectRatio, 1, 5000 );
        
        eyePosition = [ 0, 0, g_eyeRadius];
        m4.lookAt( view, eyePosition, target, up );
        m4.mul( viewProjection, view, projection );
        
        if( m_twist )
        {
            m_twistAngle += m_twistInc * 10 * elapsedTime;
            if( m_twistAngle > Math.PI )
            {
                m_state.updateState();
                m_twistAngle = 0;

                if( !m_continuousMode )
                    m_twist = false;
            }
        }

        var first = m_state.firstMatrix( m_twistAngle );
        drawOneCircle( viewProjection, first[1], scene );
        var done = false;
        while( !done )
        {
            var next = m_state.nextMatrix( m_twistAngle );
            if( next[0] == -1 )
                done = true;
            else
                drawOneCircle( viewProjection, next[1], scene );
        }

        // Set the alpha to 255.
        gl.colorMask( false, false, false, true );
        gl.clearColor( 0, 0, 0, 1 );
        gl.clear( gl.COLOR_BUFFER_BIT );
    }

    function drawOneCircle( viewProjection, modelView, scene )
    {
        // Setup uniforms.
        scene.uniforms.worldViewProjection = viewProjection;
        scene.uniforms.mvMatrix = modelView;
        scene.uniforms.angle = m_twistAngle;
        for( var uniform in scene.uniforms ) 
            scene.program.setUniform( uniform, scene.uniforms[uniform] );

        for( var m = 0; m<scene.models.length; m++ )
        {
            scene.models[m].drawPrep();
            scene.models[m].draw();
        }
    }

    return {
        modelReady   : modelIsReady,
        startLoading : startLoading,
        render       : render
    };
}

function initialize()
{
    math = tdl.math;
    fast = tdl.fast;
    canvas = document.getElementById( "modelView" );
    
    gl = tdl.webgl.setupWebGL( canvas );
    if( !gl )
        return false;
    
    var app = CreateApp();
    var then = (new Date()).getTime() * 0.001;

    function render()
    {
        tdl.webgl.requestAnimationFrame( render, canvas );
                
        if( !app.modelReady() )
            return;

        if( !document.hasFocus() )
            return;

        // Compute the elapsed time since the last rendered frame
        // in seconds.
        var now = (new Date()).getTime() * 0.001;
        var elapsedTime = now - then;
        then = now;
        
        app.render( elapsedTime );
    }

    app.startLoading();
    render();
    return true;
}
