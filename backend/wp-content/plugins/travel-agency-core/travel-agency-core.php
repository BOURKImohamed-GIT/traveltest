<?php
/**
 * Plugin Name: Travel Agency Core
 * Description: Tours, day trips and activities for a travel agency: listings, cities, pages, reviews, booking requests by email and agency details, with a REST API for the MoroccoTravely theme. Imports demo content on first activation.
 * Version: 1.0.0
 * Requires PHP: 8.0
 * Text Domain: travel-agency-core
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'TAC_VERSION', '1.0.0' );
define( 'TAC_DIR', plugin_dir_path( __FILE__ ) );

require_once TAC_DIR . 'includes/post-types.php';
require_once TAC_DIR . 'includes/meta.php';
require_once TAC_DIR . 'includes/admin.php';
require_once TAC_DIR . 'includes/reviews.php';
require_once TAC_DIR . 'includes/rest.php';
require_once TAC_DIR . 'includes/cors.php';
require_once TAC_DIR . 'includes/auth.php';
require_once TAC_DIR . 'includes/profile.php';
require_once TAC_DIR . 'includes/bookings.php';
require_once TAC_DIR . 'includes/admin-lists.php';
require_once TAC_DIR . 'includes/settings.php';
require_once TAC_DIR . 'includes/sample-content.php';

register_activation_hook(
	__FILE__,
	function () {
		tac_register_post_types();
		tac_register_host_role();
		flush_rewrite_rules();
		// Import the demo content on the next admin page load (see includes/sample-content.php).
		update_option( 'tac_import_pending', 1 );
	}
);

register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );
