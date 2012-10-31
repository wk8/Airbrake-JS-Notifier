var airbrakeLogger = function ($) {

    var apiKey           = null;

    // default configuration values
    var apiEndpoint      = 'http://api.airbrake.io/notifier_api/v2/notices';
    var environmentName  = 'production';
    var errorPrefix      = '';
    var seamlessly       = true;
    var additionalParams = {};
    var component        = '';
    var action           = '';
    var projectRoot      = null;

    // fixed values
    var notifierName     = 'x8wk-Airbrake-JS';
    var notifierVersion  = '0.0.1';
    var notifierUrl      = 'https://github.com/x8wk/Airbrake-JS-Notifier';
    var apiVersion       = '2.0';
    var parseBTregex     = /^(.*)@(.+):(\d+)$/;
    var xmlHeader        = '<?xml version="1.0" encoding="UTF-8"?>';

    // internal vars
    var previousHandler  = null;

    function init(settings)
    {
        apiKey           = settings.apiKey          || apiKey         ;
        environmentName  = settings.environmentName || environmentName;
        errorPrefix      = settings.errorPrefix     || errorPrefix    ;
        seamlessly       = settings.seamlessly      || seamlessly     ;
        component        = settings.component       || component      ;
        action           = settings.action          || action         ;
        projectRoot      = settings.projectRoot     || projectRoot    ;
        $.extend(additionalParams, settings.additionalParams);
    }

    function start()
    {
        if (apiKey !== null) {
            previousHandler = window.onerror;
            window.onerror = handleError;
        }
    }

    function stop()
    {
        window.onerror = previousHandler;
    }

    // {{{ Private methods

    function handleError(message, file, line)
    {
        xml = createNotice(message, file, line);
        $.post(apiEndpoint, xml);
        if (seamlessly) {
            if (previousHandler !== null)
                return previousHandler(message, file, line);
            else
                return true;
        }
        return false;
    }

    function createNotice(message, file, line)
    {
        var notice = $('<notice version="' + apiVersion + '"></notice>');
        notice.append($('<api-key />').text(apiKey));

        var notifier = $('<notifier />');
        notifier.append($('<name />').text(notifierName));
        notifier.append($('<version />').text(notifierVersion));
        notifier.append($('<url />').text(notifierUrl));
        notice.append(notifier);

        var error = $('<error />');
        error.append($('<class />').text('Javascript Error'));
        message = errorPrefix + (errorPrefix? ' - ' : '') + 'JS error: ' + message + ' (in ' + file + ' at line ' + line + ')';
        error.append($('<message />').text(message));
        var backtrace = $('<backtrace />');
        backtrace.append('<line file="' + file +'" number="' + line + '" />');
        var backtraceArray = printStackTrace({guess: true}).reverse();
        for (var i = 0; i < backtraceArray.length; i++) {
            var line = backtraceArray[i];
            var matches = parseBTregex.exec(line);
            var lineString = '<line ';
            if (matches[1]) {
                lineString += 'method="' + matches[1] + '" ';
            }
            lineString += 'file="' + matches[2] +'" number="' + matches[3] + '" />';
            backtrace.append(lineString);
        }
        error.append(backtrace);
        notice.append(error);

        var request = $('<request />');
        request.append($('<url />').text(encodeURI(window.location)));
        request.append($('<component />').text(component));
        request.append($('<action />').text(action));
        var params = $('<params />');
        var paramsArray = buildParams(message);
        for (var param in paramsArray) {
            params.append($('<var key="' + param + '" />').text(paramsArray[param]))
        }
        request.append(params);
        notice.append(request);

        var serverEnvironment = $('<server-environment />');
        if (projectRoot) {
            serverEnvironment.append($('<project-root />').text(projectRoot));
        }
        serverEnvironment.append($('<environment-name />').text(environmentName));
        notice.append(serverEnvironment);

        // for some reason, html() doesn't include the root element
        var root = $('<root />');
        root.append(notice);
        return xmlHeader + root.html();
    }

    function buildParams(errorMessage)
    {
        $.extend(additionalParams, {
            fullErrorMessage: errorMessage,
        });
        return additionalParams;
    }

    // }}}

    return {
        init:  init ,
        start: start,
        stop:  stop ,
    }

}(jQuery);
