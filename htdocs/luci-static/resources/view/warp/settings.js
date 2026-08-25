'use strict';
'require view';
'require form';
'require fs';
'require ui';
'require uci';

return view.extend({
    load: function () {
        return Promise.all([
            uci.load('warp'),
            L.resolveDefault(fs.exec('/bin/netstat', ['-tln']), { stdout: '' }),
            L.resolveDefault(fs.stat('/etc/warp/reg.json'), null)
        ]);
    },

    render: function (data) {
        var netstatOutput = data[1].stdout || '';
        var accountExists = data[2] !== null;
        var socksPort = uci.get('warp', 'config', 'socks_port') || '1080';
        var httpPort = uci.get('warp', 'config', 'http_port') || '8118';

        var m, s, o;

        m = new form.Map('warp', _('Cloudflare WARP'),
            _('Cloudflare WARP is a free VPN service that encrypts your network traffic and provides faster, more secure internet access.'));

        // Status area
        s = m.section(form.NamedSection, 'config', 'warp', _('Status'));
        s.anonymous = true;

        o = s.option(form.DummyValue, '_status', _('Service Status'));
        o.rawhtml = true;
        o.cfgvalue = function () {
            var isRunning = netstatOutput.indexOf(':' + socksPort + ' ') !== -1 || netstatOutput.indexOf(':' + httpPort + ' ') !== -1;

            var status = '<span style="color: ' + (isRunning ? '#28a745' : '#dc3545') + '; font-weight: bold;">';
            status += isRunning ? '✓ Running' : '✗ Stopped';
            status += '</span>';

            return status;
        };

        o = s.option(form.DummyValue, '_account', _('Account Status'));
        o.rawhtml = true;
        o.cfgvalue = function () {
            return accountExists
                ? '<span style="color: #28a745; font-weight: bold;">✓Registered</span>'
                : '<span style="color: #ffc107; font-weight: bold;">⚠ Unregistered</span>';
        };

        // Basic Settings
        s = m.section(form.NamedSection, 'config', 'warp', _('Basic Settings'));
        s.anonymous = true;

        o = s.option(form.Flag, 'enabled', _('Enable'));
        o.rmempty = false;
        o.default = '0';

        o = s.option(form.Value, 'endpoint', _('Server address'));
        o.placeholder = '162.159.193.1:2408';
        o.rmempty = true;
        o.description = _('Custom WARP server endpoint address and port (e.g., engage.cloudflareclient.com:2408). If left blank, the default endpoint will be used.');

        // Proxy Settings
        s = m.section(form.NamedSection, 'config', 'warp', _('Proxy Settings'));
        s.anonymous = true;

        o = s.option(form.Flag, 'global_proxy', _('Global Agent'));
        o.default = '0';
        o.description = _('When enabled, all LAN traffic is forwarded to WARP via nftables TPROXY transparent proxying. This feature must be disabled when coexisting with other transparent proxies such as OpenClash.');

        o = s.option(form.Flag, 'bypass_china', _('Bypass mainland China IP addresses'));
        o.default = '0';
        o.description = _('Effective only when the global proxy is enabled. When enabled, connections to IP addresses in mainland China will bypass WARP and connect directly.');
        o.depends('global_proxy', '1');

        // SOCKS5 Agent
        s = m.section(form.NamedSection, 'config', 'warp', _('SOCKS5 proxy'));
        s.anonymous = true;

        o = s.option(form.Flag, 'socks_enabled', _('Enable SOCKS5 proxy'));
        o.default = '1';
        o.description = _('Enable the local SOCKS5 proxy port. Note: The global proxy feature relies on the SOCKS5 proxy.');

        o = s.option(form.Value, 'socks_port', _('SOCKS5 port'));
        o.datatype = 'port';
        o.default = '1080';
        o.depends('socks_enabled', '1');

        // HTTP Proxy
        s = m.section(form.NamedSection, 'config', 'warp', _('HTTP Proxy'));
        s.anonymous = true;

        o = s.option(form.Flag, 'http_enabled', _('Enable HTTP proxy'));
        o.default = '0';
        o.description = _('Open an HTTP proxy port locally.');

        o = s.option(form.Value, 'http_port', _('HTTP port'));
        o.datatype = 'port';
        o.default = '8118';
        o.depends('http_enabled', '1');

        // Account Information
        s = m.section(form.NamedSection, 'config', 'warp', _('Account Information'));
        s.anonymous = true;

        o = s.option(form.Value, 'license_key', _('WARP+ License Key'));
        o.password = true;
        o.rmempty = true;
        o.description = _('If you have a WARP+ license key, you can enter and apply it here. After saving this page, please go to the "Status" page and click the "Apply License Key" button (if the button is missing, you can trigger a configuration update by starting or restarting the service, or by running `warp-manager license` from the command line).');

        return m.render();
    }
});
