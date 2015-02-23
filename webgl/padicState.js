var Padic = Padic || {};

Padic.State = function()
{
    //
    // Control over the modelview matrix stack.
    // http://learningwebgl.com/blog/?p=239
    //

    var mvMatrix = mat4.create();
    var mvMatrixStack = [];

    function mvPushMatrix() 
    {
        var copy = mat4.create();
        mat4.set( mvMatrix, copy );
        mvMatrixStack.push( copy );
    }

    function mvPopMatrix() 
    {
        if( mvMatrixStack.length == 0 ) 
        {
            throw "Invalid popMatrix!";
        }
        mvMatrix = mvMatrixStack.pop();
    }

    this.getMvMatrix = function()
    {
        return this.mvMatrix;
    }

    //
    // Control over the state.
    //
    // Organization (it is a binary tree).
    // level 1: 0
    // level 2: 1 2
    // level 3: 3 4 5 6
    // level 4: 7 8 9 10 11 12 13 14
    // ...

    this.incrementLevels = function()
    {
        m_displayLevels++;
        if( m_displayLevels > 7 )
            m_displayLevels = 7;
    }

    this.decrementLevels = function()
    {
        m_displayLevels--;
        if( m_displayLevels < 2 )
            m_displayLevels = 2;
    }

    var m_levels = 7;
    var m_displayLevels = 5;
    var m_state = [];

    function totalNumCircles()
    {
        return Math.pow( 2, m_levels ) - 1;
    }

    function numCirclesForLevel( level )
    {
        return Math.pow( 2, level - 1 );
    }

    function startIndexForLevel( level )
    {
        return Math.pow( 2, level - 1 ) - 1;
    }

    function levelForIndex( index )
    {
        var level = 0;
        for( var i=1; i<=m_levels; i++ )
        {
            if( index >= startIndexForLevel( i ) )
                level++;
            else
                break;
        }

        return level;
    }

    function childLeft( index )
    {
        return 2*index + 1;
    }

    function childRight( index )
    {
        return 2*index + 2;
    }

    function parent( index )
    {
        return Math.floor( ( index - 1 ) / 2 );
    }

    function isLeftNode( index )
    {
        return index % 2 == 1;
    }

    function doesCircleRotate( index )
    {
        return m_state[index][1];
    }

    this.initState = function()
    {
        m_state = [];
        for( var i=1; i<=m_levels; i++ )
        {
            var numCircles = numCirclesForLevel( i );
            for( var j=0; j<numCircles; j++ )
            {
                // Some other interesting choices for which circle rotates.
                //var rotates = isLeftNode( m_state.length );
                //var rotates = j == numCircles - 1;
                //var rotates = !isLeftNode( m_state.length );
                //var rotates = i % 2 == 1 ? isLeftNode( m_state.length ) : !isLeftNode( m_state.length );
                //var rotates = j == 0;
                
                m_state.push( [ 0, false ] );   // XXX - would be better to store which circles rotate elsewhere.
            }
        }

        // Update the circles which rotate.
        m_state[0][1] = true;
        var left = false;
        var currentLevel = 2;
        var currentIndex = 0;
        while( currentLevel <= m_levels )
        {
            if( left )
                currentIndex = childLeft( currentIndex );
            else
                currentIndex = childRight( currentIndex );
            m_state[currentIndex][1] = true;
            left = !left;
            currentLevel++;
        }
    }

    function flipIndex( index )
    {
        m_state[index][0] = m_state[index][0] == 0 ? 1 : 0;
    }

    // Mirror a subsection of an array of indices, tracking mirrors.
    function mirrorSubArray( array, start, end )
    {
        var temp = [];
        for( var i=end; i>=start; i-- )
            temp.push( [ array[i][0], array[i][1] ] );
        for( var i=start; i<=end; i++ )
        {
            array[i][0] = temp[i][0];
            array[i][1] = !temp[i][1];
        }
    }

    function getAndFlip( index, flip )
    {
        var state = m_state[index][0];
        if( flip )
            return state == 0 ? 1 : 0;
        
        return state == 0 ? 0 : 1;
    }

    // Updates the state after one p-adic addition step.
    this.updateState = function()
    {
        for( var i=1; i<=m_levels; i++ )
        {
            var startIndex = startIndexForLevel( i );
            if( startIndex == 0 )
            {
                flipIndex( 0 );
                continue;
            }

            // Temp array for calculations.
            var numCircles = numCirclesForLevel( i );
            var indices = [];
            for( var j=0; j<numCircles; j++ )
                indices.push( [ startIndex + j, false ] );

            // This is the end result of 2-adic addition.  
            // Recursive mirroring of successive halves.
            for( var j=i; j>=1; j-- )
            {
                var nc = numCirclesForLevel( j );
                mirrorSubArray( indices, 0, nc - 1 );
            }

            // Calc the new state, based on the previous state.
            var newState = [];
            for( var j=0; j<numCircles; j++ )
            {
                var previousIndex = indices[j];
                newState.push( getAndFlip( previousIndex[0], previousIndex[1] ) );
            }

            // Now safe to update.
            for( var j=0; j<numCircles; j++ )
                m_state[startIndex + j][0] = newState[j];
        }
    }

    //
    // Drawing matrix helpers.
    // NOTE: We need to enumerate in a depth first fashion,
    //       so we can use matrix push/pop for the recursive rotations.
    // NOTE: In all these methods, 'angle' is the current animation angle.

    var m_currentIndex = 0;

    this.firstMatrix = function( angle )
    {
        mat4.identity( mvMatrix );
        mat4.rotate( mvMatrix, angle, [ 0, 0, 1 ] );
        m_currentIndex = 0;
        return [ 0, applyState( 0 ) ];
    }

    function updateMatrix( index, left, angle )
    {
        // Magic number from drawing code.
        var shrink = 0.975;

        // Translate
        var level = levelForIndex( m_currentIndex );
        var offset = 0.5 * shrink;
        if( left )
            offset *= -1;
        mat4.translate( mvMatrix, [ offset, 0, 0 ] );

        // Scale (each level is always half the size of the previous level).
        var scale = 0.5 * shrink;   
        mat4.scale( mvMatrix, [ scale, scale, scale ] );

        // Rotate
        if( doesCircleRotate( m_currentIndex ) )
            mat4.rotate( mvMatrix, angle, [ 0, 0, 1 ] );
    }

    // Applies the current state to a copy of mvMatrix, 
    // so we won't affect mvMatrix with state stuff 
    // (if we did, it would affect children when rotating).
    // Returns the resulting matrix.
    function applyState( index )
    {
        var copy = mat4.create();
        mat4.set( mvMatrix, copy );

        if( m_state[index][0] == 1 )
            mat4.rotate( copy, Math.PI, [ 0, 0, 1 ] );

        return copy;
    }

    // An iterator to continually grab the next matrix, in DFS order.
    // Returns an array with the circle index and matrix.
    // If there are no more matrices, returns -1 for the index.
    this.nextMatrix = function( angle )
    {
        // First thing we try is grabbing the left child.
        // We can always do this if we're not on the bottom level.
        var level = levelForIndex( m_currentIndex );
        if( level < m_displayLevels )
        {
            m_currentIndex = childLeft( m_currentIndex );
            mvPushMatrix();
            updateMatrix( m_currentIndex, true, angle );
            return [ m_currentIndex, applyState( m_currentIndex ) ];
        }

        // If we are on a right node, grab parents until we hit a left node.
        while( !isLeftNode( m_currentIndex ) )
        {
            m_currentIndex = parent( m_currentIndex );
            mvPopMatrix();

            // Are we done? (hit the root node)
            if( m_currentIndex == 0 )
                return [ -1, 0 ];
        }

        // We are on a left node, and need to.
        // jump to the right sibling.
        m_currentIndex++;
        mvPopMatrix();
        mvPushMatrix();
        updateMatrix( m_currentIndex, false, angle );
        return [ m_currentIndex, applyState( m_currentIndex ) ];
    }
}