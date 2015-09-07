window.onload = function(){

    var options = {
        resizeLgImages:     true,
        displayNav:         false,
        handleUnsupported:  'remove',
        keysClose:          ['c', 27] // c or esc
    };

    Shadowbox.init(options);

    console.log('Shadowbox inited', !!(typeof Shadowbox === 'object'));

};
