AMAANTRADER — DESIGN + PAGE UPDATE

Design direction: editorial fashion storefront with a warm ivory background, charcoal type, burnt-orange accents, asymmetric image-led hero panels, a restrained marquee, and modular grid layouts. Reference material was supplied as AI/EPS/JPG design files and used as inspiration only; the original template photography is not used as AmaanTrader product photography.

Pages added:
- /shop/ searchable/sortable catalog via /api/products
- /about/ brand story
- /lookbook/ dynamic editorial product grid
- /contact/ public contact channels (configured in site-config.js)
- /order-support/ cancellation and refund request workflow
- /size-guide/ standalone size guidance; measurements deliberately left as supplier-confirmation placeholders

Existing checkout PIN lookup uses the server-side /api/pincode/:pin route and India Post's public PIN directory. It fills district/city and state but cannot determine a customer's street or exact GPS location.

Store notification email/WhatsApp and Razorpay logic remain server-side in server.js and are configured only through .env. Do not put API secrets in site-config.js or front-end JavaScript. WhatsApp sends through a Meta-approved template. Razorpay payment/refund state changes require valid verification/webhooks and a public HTTPS webhook endpoint on a deployed server.


Navigation note: inner-page BAG links deep-link back to the home page and open the saved browser cart drawer. Customer-facing WhatsApp/email details are public settings in site-config.js; the owner notification destination and API credentials remain private in .env.
