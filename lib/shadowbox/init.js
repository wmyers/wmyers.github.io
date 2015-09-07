window.onload = function(){

    var options = {
        handleUnsupported:  'link',
        keysClose:          ['c', 27] // c or esc
    };

    Shadowbox.init(options);

    console.log('Shadowbox inited', !!(typeof Shadowbox === 'object'));

};
