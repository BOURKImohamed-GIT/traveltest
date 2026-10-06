<?php
/**
 * MoroccoTravely theme: loads the built app (app/app.js, app/app.css) on every
 * front-end page and tells it where the WordPress REST API is.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action(
	'after_setup_theme',
	function () {
		add_theme_support( 'title-tag' );
		add_theme_support( 'post-thumbnails' );
		// Edited in Appearance → Menus; the app reads them from /wp-json/travel/v1/menus.
		register_nav_menus(
			array(
				'primary' => __( 'Main menu (dropdowns: drag items under another item)', 'moroccotravely' ),
				'quick'   => __( 'Orange tab under the menu', 'moroccotravely' ),
				'footer'  => __( 'Footer: useful links', 'moroccotravely' ),
			)
		);
	}
);

add_action( 'wp_enqueue_scripts', 'moroccotravely_enqueue_app' );

function moroccotravely_enqueue_app() {
	$dir = get_theme_file_path( 'app/' );
	$url = get_theme_file_uri( 'app/' );
	if ( ! file_exists( $dir . 'app.js' ) ) {
		return;
	}
	wp_enqueue_style( 'moroccotravely-app', $url . 'app.css', array(), (string) filemtime( $dir . 'app.css' ) );
	wp_enqueue_script( 'moroccotravely-app', $url . 'app.js', array(), (string) filemtime( $dir . 'app.js' ), true );

	$config = array(
		'apiUrl'    => rest_url( 'travel/v1' ),
		'assetsUrl' => $url,
		'basePath'  => wp_parse_url( home_url( '/' ), PHP_URL_PATH ) ?: '/',
		'siteName'  => wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ),
	);
	wp_add_inline_script( 'moroccotravely-app', 'window.TRAVEL_CONFIG = ' . wp_json_encode( $config ) . ';', 'before' );
}

// The app is an ES module.
add_filter(
	'script_loader_tag',
	function ( $tag, $handle ) {
		return 'moroccotravely-app' === $handle ? str_replace( '<script ', '<script type="module" ', $tag ) : $tag;
	},
	10,
	2
);

// The app has its own pages (/listings/…, /search…): answer them with 200 instead of
// WordPress's 404, and don't let WordPress redirect them to a similar-looking post.
add_action(
	'template_redirect',
	function () {
		global $wp_query;
		if ( is_404() ) {
			$wp_query->is_404 = false;
			status_header( 200 );
			// Keep the app's own URLs as they are (no trailing-slash redirect).
			remove_action( 'template_redirect', 'redirect_canonical' );
		}
	},
	0
);
add_filter( 'do_redirect_guess_404_permalink', '__return_false' );

// The block editor's front-end styles aren't used by the app.
add_action(
	'wp_enqueue_scripts',
	function () {
		wp_dequeue_style( 'wp-block-library' );
		wp_dequeue_style( 'global-styles' );
		wp_dequeue_style( 'classic-theme-styles' );
	},
	100
);

// Browser tab icon when no Site Icon is set in Appearance → Customize.
add_action(
	'wp_head',
	function () {
		if ( ! has_site_icon() ) {
			echo '<link rel="icon" type="image/svg+xml" href="' . esc_url( get_theme_file_uri( 'app/favicon.svg' ) ) . '">' . "\n";
		}
	}
);

// The theme needs the Travel Agency Core plugin for its content.
add_action(
	'admin_notices',
	function () {
		if ( ! function_exists( 'tac_settings' ) && current_user_can( 'activate_plugins' ) ) {
			echo '<div class="notice notice-warning"><p>' . esc_html__( 'The MoroccoTravely theme needs the Travel Agency Core plugin: go to Plugins → Add New → Upload Plugin and upload travel-agency-core.zip.', 'moroccotravely' ) . '</p></div>';
		}
	}
);
