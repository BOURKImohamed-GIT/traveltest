<?php
/**
 * Plugin Name: Travel Agency Core
 * Description: Tours, day trips, activities and camping for a travel agency: listings, destinations, pages, reviews, booking requests and Google sign-in for travellers, exposed over the REST API for the React frontend.
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

register_activation_hook(
	__FILE__,
	function () {
		tac_register_post_types();
		tac_register_host_role();
		flush_rewrite_rules();
	}
);

register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );
