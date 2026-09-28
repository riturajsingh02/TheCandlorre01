/* =========================================================
   THE Candlorre — AUTHENTICATION & FORM LOGIC
   Handles Login, Signup, Password Recovery, and Password Toggles
   Powered by ShopifyService
   ========================================================= */

(function () {
  'use strict';

  // Helper to read query parameter
  function getRedirectParam(defaultUrl = 'account.html') {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (redirect && !redirect.startsWith('http') && !redirect.startsWith('//')) {
      return redirect;
    }
    return defaultUrl;
  }

  // Show / Hide password toggler
  function initPasswordToggles() {
    document.querySelectorAll('.password-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.closest('.password-input-wrap')?.querySelector('input');
        if (!input) return;
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
        
        // Update SVG icon
        btn.innerHTML = isPassword ? `
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        ` : `
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        `;
      });
    });
  }

  // Clear banner / errors
  function clearErrors(form) {
    const banner = form.querySelector('.auth-alert-banner');
    if (banner) banner.remove();
    form.querySelectorAll('.input-error-msg').forEach(el => el.remove());
    form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
  }

  function showErrorBanner(form, message) {
    clearErrors(form);
    const banner = document.createElement('div');
    banner.className = 'auth-alert-banner alert-error';
    banner.setAttribute('role', 'alert');
    banner.innerHTML = `
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0; margin-top:2px;">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>${message}</span>
    `;
    form.prepend(banner);
  }

  function showSuccessBanner(form, message) {
    clearErrors(form);
    const banner = document.createElement('div');
    banner.className = 'auth-alert-banner alert-success';
    banner.setAttribute('role', 'status');
    banner.innerHTML = `
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0; margin-top:2px;">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>${message}</span>
    `;
    form.prepend(banner);
  }

  function setInlineError(input, message) {
    input.classList.add('input-error');
    const existing = input.parentElement.querySelector('.input-error-msg');
    if (existing) existing.remove();
    const span = document.createElement('span');
    span.className = 'input-error-msg';
    span.textContent = message;
    input.parentElement.appendChild(span);
  }

  // 1. Handle Login
  async function handleLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const form = document.getElementById('loginForm');
    if (!form) return;

    clearErrors(form);

    const identifierInput = document.getElementById('loginIdentifier') || document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const rememberCheckbox = document.getElementById('loginRemember');
    const submitBtn = form.querySelector('button[type="submit"]');

    const identifier = (identifierInput?.value || '').trim();
    const password = passwordInput?.value || '';
    const remember = Boolean(rememberCheckbox?.checked);

    let hasError = false;
    if (!identifier) {
      setInlineError(identifierInput, 'Email address or mobile number is required.');
      hasError = true;
    } else {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
      const isPhone = /^[0-9+-\s()]{8,15}$/.test(identifier);
      if (!isEmail && !isPhone) {
        setInlineError(identifierInput, 'Please enter a valid email or 10-digit mobile number.');
        hasError = true;
      }
    }

    if (!password) {
      setInlineError(passwordInput, 'Password is required.');
      hasError = true;
    }

    if (hasError) return;

    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Sign In';
    if (submitBtn) {
      submitBtn.classList.add('is-loading');
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Signing In...';
    }

    try {
      if (!window.ShopifyService) {
        throw new Error('Service layer is unavailable. Please refresh.');
      }

      await window.ShopifyService.login(identifier, password, remember);

      if (submitBtn) {
        submitBtn.innerHTML = '✦ Authenticated';
      }

      const redirectTarget = getRedirectParam('account.html');
      setTimeout(() => {
        window.location.replace(redirectTarget);
      }, 250);
    } catch (err) {
      showErrorBanner(form, err.message || 'Unable to sign in. Please verify your credentials.');
      if (submitBtn) {
        submitBtn.classList.remove('is-loading');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    }
  }

  // 2. Handle Registration (Signup)
  async function handleSignup(e) {
    if (e && e.preventDefault) e.preventDefault();
    const form = document.getElementById('signupForm');
    if (!form) return;

    clearErrors(form);

    const firstNameInput = document.getElementById('signupFirstName');
    const lastNameInput = document.getElementById('signupLastName');
    const emailInput = document.getElementById('signupEmail');
    const phoneInput = document.getElementById('signupPhone');
    const passwordInput = document.getElementById('signupPassword');
    const confirmInput = document.getElementById('signupConfirmPassword');
    const termsInput = document.getElementById('signupTerms');
    const submitBtn = form.querySelector('button[type="submit"]');

    const firstName = (firstNameInput?.value || '').trim();
    const lastName = (lastNameInput?.value || '').trim();
    const email = (emailInput?.value || '').trim();
    const phone = (phoneInput?.value || '').trim();
    const password = passwordInput?.value || '';
    const confirmPassword = confirmInput?.value || '';

    let hasError = false;
    if (!firstName) {
      setInlineError(firstNameInput, 'First name is required.');
      hasError = true;
    }

    if (!email) {
      setInlineError(emailInput, 'Email address is required.');
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInlineError(emailInput, 'Please enter a valid email address.');
      hasError = true;
    }

    if (phone && !/^[0-9+-\s()]{8,15}$/.test(phone)) {
      setInlineError(phoneInput, 'Please enter a valid contact mobile number.');
      hasError = true;
    }

    if (!password) {
      setInlineError(passwordInput, 'Password is required.');
      hasError = true;
    } else if (password.length < 8) {
      setInlineError(passwordInput, 'Password must be at least 8 characters long.');
      hasError = true;
    } else {
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasDigitOrSpecial = /[\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
      if (!hasUpper || !hasLower || !hasDigitOrSpecial) {
        setInlineError(passwordInput, 'Must include an uppercase letter, lowercase letter, and a number or symbol.');
        hasError = true;
      }
    }

    if (confirmInput && password !== confirmPassword) {
      setInlineError(confirmInput, 'Passwords do not match.');
      hasError = true;
    }

    if (termsInput && !termsInput.checked) {
      showErrorBanner(form, 'Please agree to the Terms & Conditions and Privacy Policy to create an account.');
      hasError = true;
    }

    if (hasError) return;

    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Create Account';
    if (submitBtn) {
      submitBtn.classList.add('is-loading');
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Creating Account...';
    }

    try {
      if (!window.ShopifyService) {
        throw new Error('Service layer is unavailable.');
      }

      await window.ShopifyService.register({
        firstName,
        lastName,
        email,
        phone,
        password,
        confirmPassword,
        agreeTerms: Boolean(termsInput?.checked)
      });

      showSuccessBanner(form, 'Account created successfully! Redirecting to your account sanctuary...');
      if (submitBtn) {
        submitBtn.innerHTML = '✦ Welcome';
      }

      const redirectTarget = getRedirectParam('account.html');
      setTimeout(() => {
        window.location.href = redirectTarget;
      }, 700);
    } catch (err) {
      showErrorBanner(form, err.message || 'Could not create account. Please check your details.');
      if (submitBtn) {
        submitBtn.classList.remove('is-loading');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    }
  }

  // 3. Multi-Step Password Recovery (OTP + Reset)
  let recoveryState = {
    userId: null,
    identifier: '',
    resetToken: '',
    timerInterval: null
  };

  function updateRecoveryStepIndicator(step) {
    const dot1 = document.getElementById('dotStep1');
    const dot2 = document.getElementById('dotStep2');
    const dot3 = document.getElementById('dotStep3');
    if (!dot1 || !dot2 || !dot3) return;

    dot1.style.background = step >= 1 ? 'var(--gold)' : '#e5e7eb';
    dot2.style.background = step >= 2 ? 'var(--gold)' : '#e5e7eb';
    dot3.style.background = step >= 3 ? 'var(--gold)' : '#e5e7eb';
  }

  function startOtpCountdown(seconds = 60) {
    clearInterval(recoveryState.timerInterval);
    const timerEl = document.getElementById('resendTimer');
    const countdownText = document.getElementById('resendCountdownText');
    const resendBtn = document.getElementById('resendOtpBtn');

    if (!timerEl || !countdownText || !resendBtn) return;

    countdownText.style.display = 'inline';
    resendBtn.style.display = 'none';
    let remaining = seconds;
    timerEl.textContent = remaining;

    recoveryState.timerInterval = setInterval(() => {
      remaining--;
      timerEl.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(recoveryState.timerInterval);
        countdownText.style.display = 'none';
        resendBtn.style.display = 'inline';
      }
    }, 1000);
  }

  // Step 1: Send OTP
  async function handleSendOtp(e) {
    if (e && e.preventDefault) e.preventDefault();
    const form = document.getElementById('forgotPasswordForm');
    if (!form) return;

    clearErrors(form);

    const identifierInput = document.getElementById('resetIdentifier') || document.getElementById('resetEmail');
    const submitBtn = document.getElementById('resetSubmitBtn');
    const identifier = (identifierInput?.value || '').trim();

    if (!identifier) {
      setInlineError(identifierInput, 'Please enter your registered email address or mobile number.');
      return;
    }

    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Send Verification Code';
    if (submitBtn) {
      submitBtn.classList.add('is-loading');
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Sending Code...';
    }

    try {
      if (!window.ShopifyService) throw new Error('Service unavailable.');
      const result = await window.ShopifyService.recoverPassword(identifier);

      recoveryState.identifier = identifier;
      recoveryState.userId = result.userId || null;

      // Transition to Step 2 Panel
      const step1 = document.getElementById('step1Panel');
      const step2 = document.getElementById('step2Panel');
      const subtitle = document.getElementById('otpSubtitle');

      if (step1 && step2) {
        step1.style.display = 'none';
        step2.style.display = 'block';
        if (subtitle) {
          subtitle.textContent = `A 6-digit verification code has been dispatched to ${identifier}.`;
        }
        updateRecoveryStepIndicator(2);
        startOtpCountdown(60);
      } else {
        showSuccessBanner(
          form,
          `Password reset instructions have been dispatched to <strong>${identifier}</strong>. Please check your messages.`
        );
      }
    } catch (err) {
      showErrorBanner(form, err.message || 'Unable to process reset request. Please try again.');
    } finally {
      if (submitBtn) {
        submitBtn.classList.remove('is-loading');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    }
  }

  // Step 2: Verify OTP
  async function handleVerifyOtp(e) {
    if (e && e.preventDefault) e.preventDefault();
    const form = document.getElementById('verifyOtpForm');
    if (!form) return;

    clearErrors(form);

    const otpInput = document.getElementById('resetOtp');
    const submitBtn = document.getElementById('verifyOtpBtn');
    const otp = (otpInput?.value || '').trim();

    if (!otp || otp.length !== 6) {
      setInlineError(otpInput, 'Please enter the 6-digit verification code.');
      return;
    }

    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Verify & Proceed';
    if (submitBtn) {
      submitBtn.classList.add('is-loading');
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Verifying...';
    }

    try {
      const result = await window.ShopifyService.verifyOtp(recoveryState.userId, recoveryState.identifier, otp);
      recoveryState.resetToken = result.resetToken;
      if (result.userId) recoveryState.userId = result.userId;

      // Transition to Step 3
      const step2 = document.getElementById('step2Panel');
      const step3 = document.getElementById('step3Panel');
      if (step2 && step3) {
        step2.style.display = 'none';
        step3.style.display = 'block';
        updateRecoveryStepIndicator(3);
      }
    } catch (err) {
      showErrorBanner(form, err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      if (submitBtn) {
        submitBtn.classList.remove('is-loading');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    }
  }

  // Step 3: Set New Password
  async function handleResetPassword(e) {
    if (e && e.preventDefault) e.preventDefault();
    const form = document.getElementById('resetPasswordForm');
    if (!form) return;

    clearErrors(form);

    const newPassInput = document.getElementById('newPassword');
    const confirmPassInput = document.getElementById('confirmNewPassword');
    const submitBtn = document.getElementById('resetPasswordBtn');

    const newPassword = newPassInput?.value || '';
    const confirmPassword = confirmPassInput?.value || '';

    let hasError = false;
    if (!newPassword) {
      setInlineError(newPassInput, 'New password is required.');
      hasError = true;
    } else if (newPassword.length < 8) {
      setInlineError(newPassInput, 'Password must be at least 8 characters long.');
      hasError = true;
    }

    if (newPassword !== confirmPassword) {
      setInlineError(confirmPassInput, 'Passwords do not match.');
      hasError = true;
    }

    if (hasError) return;

    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Update Password';
    if (submitBtn) {
      submitBtn.classList.add('is-loading');
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Updating Password...';
    }

    try {
      await window.ShopifyService.resetPassword(recoveryState.userId, recoveryState.resetToken, newPassword, confirmPassword);

      // Transition to Success Panel
      const step3 = document.getElementById('step3Panel');
      const step4 = document.getElementById('step4SuccessPanel');
      if (step3 && step4) {
        step3.style.display = 'none';
        step4.style.display = 'block';
      }
    } catch (err) {
      showErrorBanner(form, err.message || 'Could not update password. Please retry recovery.');
    } finally {
      if (submitBtn) {
        submitBtn.classList.remove('is-loading');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    }
  }

  // 4. Production Google OAuth Sign-In & Sign-Up Engine
  async function getAuthConfig() {
    try {
      const resp = await fetch('/api/auth/config');
      if (resp.ok) {
        const json = await resp.json();
        return json.data || {};
      }
    } catch (e) {}
    return {};
  }

  async function processGoogleAuthToken(idToken, btn) {
    const originalContent = btn ? btn.innerHTML : '';
    try {
      if (btn) {
        btn.disabled = true;
        btn.classList.add('is-loading');
        btn.innerHTML = '<span>Verifying with Google...</span>';
      }

      const user = await window.ShopifyService.googleLogin({ idToken });
      if (user) {
        const redirectTarget = getRedirectParam('account.html');
        window.location.replace(redirectTarget);
        return;
      }
    } catch (err) {
      const form = btn?.closest('form') || document.querySelector('form');
      if (form) {
        showErrorBanner(form, err.message || 'Google authentication failed. Please try again.');
      } else {
        alert(err.message || 'Google authentication failed.');
      }
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('is-loading');
        btn.innerHTML = originalContent;
      }
    }
  }

  async function processGoogleAuthCode(code, redirectUri, btn) {
    const originalContent = btn ? btn.innerHTML : '';
    try {
      if (btn) {
        btn.disabled = true;
        btn.classList.add('is-loading');
        btn.innerHTML = '<span>Authenticating with Google...</span>';
      }

      const user = await window.ShopifyService.googleLogin({ code, redirectUri });
      if (user) {
        const redirectTarget = getRedirectParam('account.html');
        window.location.replace(redirectTarget);
        return;
      }
    } catch (err) {
      const form = btn?.closest('form') || document.querySelector('form');
      if (form) {
        showErrorBanner(form, err.message || 'Google sign-in failed. Please try again.');
      } else {
        alert(err.message || 'Google sign-in failed.');
      }
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('is-loading');
        btn.innerHTML = originalContent;
      }
    }
  }

  function openGoogleOAuthPopup(authUrl, btn) {
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      authUrl,
      'google_oauth_popup',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=no`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      // If popup blocked, redirect directly
      window.location.href = authUrl;
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.classList.add('is-loading');
      btn.innerHTML = '<span>Connecting to Google...</span>';
    }
  }

  async function initGoogleOAuth() {
    const config = await getAuthConfig();
    const googleBtns = document.querySelectorAll('.google-signin-btn, #googleAuthBtn');

    // Listen for postMessage from Google OAuth popup callback
    window.addEventListener('message', async (event) => {
      if (event.data && event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        const data = event.data;
        if (data.token) {
          window.ShopifyService.setSession(data.token, data.expiresAt, true);
        }
        if (data.customer) {
          localStorage.setItem('theCandlorre_cust_profile', JSON.stringify(data.customer));
          sessionStorage.setItem('theCandlorre_cust_profile', JSON.stringify(data.customer));
        }
        const redirectTarget = getRedirectParam('account.html');
        window.location.replace(redirectTarget);
      } else if (event.data && event.data.type === 'GOOGLE_AUTH_ERROR') {
        const form = document.querySelector('form');
        if (form) {
          showErrorBanner(form, event.data.error || 'Google authentication was not completed.');
        }
        googleBtns.forEach(btn => {
          btn.disabled = false;
          btn.classList.remove('is-loading');
          btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Google</span>
          `;
        });
      }
    });

    // If real Google Client ID is configured and Google GSI is loaded
    if (config.googleClientId && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: config.googleClientId,
          callback: (response) => {
            if (response.credential) {
              const activeBtn = document.querySelector('.google-signin-btn:focus, #googleAuthBtn');
              processGoogleAuthToken(response.credential, activeBtn);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true
        });
      } catch (e) {
        console.warn('Google Identity initialization notice:', e);
      }
    }

    googleBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();

        // 1. If Google Client ID is present
        if (config.googleClientId) {
          // If Google Identity OAuth2 Code Client is available
          if (window.google?.accounts?.oauth2) {
            try {
              const client = window.google.accounts.oauth2.initCodeClient({
                client_id: config.googleClientId,
                scope: 'openid email profile',
                ux_mode: 'popup',
                callback: async (response) => {
                  if (response.code) {
                    await processGoogleAuthCode(response.code, window.location.origin, btn);
                  }
                }
              });
              client.requestCode();
              return;
            } catch (err) {
              console.warn('OAuth code client popup failed, attempting standard popup flow:', err);
            }
          }

          // If Google One Tap / GSI Prompt is available
          if (window.google?.accounts?.id) {
            try {
              window.google.accounts.id.prompt((notification) => {
                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                  // Fallback to direct backend OAuth URL
                  fetch('/api/auth/google/url')
                    .then(r => r.json())
                    .then(data => {
                      if (data.data?.url) {
                        openGoogleOAuthPopup(data.data.url, btn);
                      }
                    })
                    .catch(() => {});
                }
              });
              return;
            } catch (e) {}
          }

          // Fallback to server-side Google OAuth URL
          try {
            const resp = await fetch('/api/auth/google/url');
            if (resp.ok) {
              const data = await resp.json();
              if (data.data?.url) {
                openGoogleOAuthPopup(data.data.url, btn);
                return;
              }
            }
          } catch (e) {}
        }

        // If Google Client ID is not yet configured in environment variables
        const form = btn.closest('form') || document.querySelector('form');
        if (form) {
          showErrorBanner(
            form,
            'Google Sign-In is ready on the backend. Please provide <strong>GOOGLE_CLIENT_ID</strong> in your environment configuration to connect with Google, or sign in using your email and password.'
          );
        } else {
          alert('Google Sign-In requires GOOGLE_CLIENT_ID to be set in your environment variables.');
        }
      });
    });
  }

  // Expose globally
  window.handleLogin = handleLogin;
  window.handleSignup = handleSignup;
  window.handleForgotPassword = handleSendOtp;
  window.handleSendOtp = handleSendOtp;
  window.handleVerifyOtp = handleVerifyOtp;
  window.handleResetPassword = handleResetPassword;

  // DOM initialization
  document.addEventListener('DOMContentLoaded', () => {
    initPasswordToggles();
    initGoogleOAuth();

    // Attach listeners
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('signupForm')?.addEventListener('submit', handleSignup);
    document.getElementById('forgotPasswordForm')?.addEventListener('submit', handleSendOtp);
    document.getElementById('verifyOtpForm')?.addEventListener('submit', handleVerifyOtp);
    document.getElementById('resetPasswordForm')?.addEventListener('submit', handleResetPassword);

    // Resend OTP button
    document.getElementById('resendOtpBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleSendOtp(e);
    });

    // If user is already authenticated on login or signup, redirect immediately to account dashboard
    if (window.ShopifyService && window.ShopifyService.isAuthenticated()) {
      const isAuthPage = window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('signup.html');
      if (isAuthPage) {
        const redirectParam = getRedirectParam('account.html');
        window.location.replace(redirectParam);
        return;
      }
    }

    // Header counters and mobile drawer synchronization
    try {
      const savedCart = JSON.parse(localStorage.getItem('theCandlorre_cart') || '[]');
      const count = savedCart.reduce((sum, item) => sum + (item.quantity || 1), 0);
      const cartBadge = document.getElementById('cartCount');
      if (cartBadge) cartBadge.textContent = count;

      const savedWish = JSON.parse(localStorage.getItem('theCandlorre_wishlist') || '[]');
      const wishBadge = document.getElementById('wishlistCount');
      if (wishBadge) wishBadge.textContent = savedWish.length;
    } catch (e) {}

    const mobDrawer = document.getElementById('mobileDrawer');
    const drawerOverlay = document.getElementById('drawerOverlay');
    document.getElementById('hamburgerBtn')?.addEventListener('click', () => {
      mobDrawer?.classList.add('active');
      drawerOverlay?.classList.add('active');
    });
    document.getElementById('closeMobileNavBtn')?.addEventListener('click', () => {
      mobDrawer?.classList.remove('active');
      drawerOverlay?.classList.remove('active');
    });
    drawerOverlay?.addEventListener('click', () => {
      mobDrawer?.classList.remove('active');
      drawerOverlay?.classList.remove('active');
    });
  });
})();
