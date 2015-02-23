
uniform mat4 worldViewProjection;
uniform mat4 mvMatrix;
uniform float angle;

attribute vec4 position;
attribute vec4 color;

varying vec4 v_color;

void main()
{
    v_color = color;
    vec4 position3d = position;
	position3d.w = 1.0;

	// Rotate
	//float component1 = position3d.x;
	//float component2 = position3d.y;
	//position3d.x = cos( angle ) * component1 - sin( angle ) * component2; 
	//position3d.y = sin( angle ) * component1 + cos( angle ) * component2;

    gl_Position = worldViewProjection * mvMatrix * position3d;
}

