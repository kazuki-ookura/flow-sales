# Email Deliverability Master Guide: Multi-Domain Strategy

To achieve high deliverability with an AI SDR system, infrastructure is just as important as the content. Follow this guide to set up a robust "Multi-Domain" sending environment.

## 1. Multi-Domain Setup (Domain Diversity)

**Why?** If you send too many emails from one domain, your reputation drops. AI-generated emails are naturally more likely to be flagged.
- **Action**: Purchase 3-5 distinct "outreach" domains (e.g., `getflowsales.com`, `tryflowsales.io`, `flowsales.co`).
- **Rule of Thumb**: Max 50 emails/day per domain (ideally 30).

## 2. Authentication (SPF, DKIM, DMARC)

Every sending domain MUST have these records configured in DNS.
- **SPF**: Specifies which mail servers are allowed to send email on behalf of your domain.
- **DKIM**: Adds a digital signature to emails, allowing the receiver to verify that the email was actually authorized by the owner of the domain.
- **DMARC**: Tells receiving servers what to do if an email fails SPF or DKIM (Set to `v=DMARC1; p=none` for warming, then move to `quarantine` or `reject`).

## 3. Custom Tracking Domain

Disable the default tracking pixel/link provided by your ESP (like Instantly/Apollo).
- **Action**: Create a custom subdomain (e.g., `link.getflowsales.com`) and point it to your ESP's tracking server. This prevents your reputation from being tied to other users of the same ESP.

## 4. Warming Process (Warmup)

NEVER start sending cold emails from a new domain immediately.
- **Action**: Use a warmup service (Instantly.ai has this built-in).
- **Duration**: Minimum 14-21 days of warming before the first "real" cold email.
- **Ratio**: Ensure at least 30-50% of your total domain volume is "warmup" emails that are opened and replied to.

## 5. Content & Syntax

AI-generated text often has a distinctive "AI scent" that spam filters detect.
- **Current Fixes in FlowSales**:
    - We strictly avoid "I hope this finds you well" or "Hope you're having a great week."
    - We use "Why now?" hooks based on real-time news/hiring data.
    - We use human-like sign-offs.

## 6. Monitoring

- Check [MXToolbox](https://mxtoolbox.com/) for blacklist status regularly.
- Monitor your "Open Rate" and "Reply Rate" in Instantly. If Open Rate falls below 40%, stop sending and re-warm the domain.
