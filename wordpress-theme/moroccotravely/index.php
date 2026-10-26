<?php
/**
 * Every front-end URL (/, /listings/…, /search, /about-us…) loads the app,
 * which reads its content from the Travel Agency Core REST API.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<div id="root"></div>
<noscript><p style="padding:24px;font-family:sans-serif"><?php esc_html_e( 'Please turn on JavaScript to see our tours.', 'moroccotravely' ); ?></p></noscript>
<?php wp_footer(); ?>
</body>
</html>
