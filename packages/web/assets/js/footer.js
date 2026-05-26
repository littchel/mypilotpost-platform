(function () {
  var el = document.getElementById('site-footer');
  if (!el) return;

  el.innerHTML = [
    '<div class="footer__container">',
    '  <div class="footer__grid">',

    '    <!-- Brand -->',
    '    <div>',
    '      <a href="/" class="footer__logo" aria-label="myPilotPost home"></a>',
    '      <p class="footer__tagline">Land the right message every time.</p>',
    '      <p class="footer__desc">Social media management and content operations platform for founders, small businesses, modern brands, agencies, and marketing teams.</p>',
    '      <div class="footer__social">',
    '        <a href="https://www.facebook.com/profile.php?id=61587795843300" class="footer__social-link" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><i class="fa-brands fa-facebook-f"></i></a>',
    '        <a href="https://www.instagram.com/mypilotpost_/" class="footer__social-link" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>',
    '        <a href="https://www.linkedin.com/company/mypilotpost" class="footer__social-link" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><i class="fa-brands fa-linkedin-in"></i></a>',
    '        <a href="https://x.com/mypilotpost" class="footer__social-link" target="_blank" rel="noopener noreferrer" aria-label="X / Twitter"><i class="fa-brands fa-x-twitter"></i></a>',
    '      </div>',
    '    </div>',

    '    <!-- Product -->',
    '    <div>',
    '      <h6 class="footer__column-title">Product</h6>',
    '      <a href="/features.html" class="footer__link">Features</a>',
    '      <a href="/solutions.html" class="footer__link">Solutions</a>',
    '      <a href="/pricing.html" class="footer__link">Pricing</a>',
    '      <a href="/resources.html" class="footer__link">Integrations</a>',
    '    </div>',

    '    <!-- Resources -->',
    '    <div>',
    '      <h6 class="footer__column-title">Resources</h6>',
    '      <a href="/resources.html" class="footer__link">Blog</a>',
    '      <a href="/resources.html" class="footer__link">News &amp; Updates</a>',
    '      <a href="/help-center.html" class="footer__link">Help Center</a>',
    '      <a href="mailto:support@mypilotpost.com" class="footer__link">Request a Feature</a>',
    '    </div>',

    '    <!-- Trust -->',
    '    <div>',
    '      <h6 class="footer__column-title">Trust</h6>',
    '      <a href="/trust.html" class="footer__link">Trust Center</a>',
    '      <a href="/security.html" class="footer__link">Security</a>',
    '      <a href="/ai-principles.html" class="footer__link">AI Principles</a>',
    '      <a href="/oauth-permissions.html" class="footer__link">OAuth Permissions</a>',
    '      <a href="/status.html" class="footer__link">Status</a>',
    '    </div>',

    '    <!-- Legal -->',
    '    <div>',
    '      <h6 class="footer__column-title">Legal</h6>',
    '      <a href="/compliance.html" class="footer__link">Compliance</a>',
    '      <a href="/privacy.html" class="footer__link">Privacy Policy</a>',
    '      <a href="/terms.html" class="footer__link">Terms of Service</a>',
    '      <a href="/refund-policy.html" class="footer__link">Refund Policy</a>',
    '      <a href="/images/PAIA_Manual.pdf" class="footer__link" target="_blank" rel="noopener">PAIA Manual</a>',
    '      <a href="/support.html" class="footer__link">Support</a>',
    '    </div>',

    '  </div>',
    '  <hr class="footer__divider">',
    '  <p class="footer__copyright">&copy; 2026 myPilotPost. All rights reserved.</p>',
    '</div>'
  ].join('\n');
})();
