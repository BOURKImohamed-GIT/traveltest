<?php
/**
 * Load the demo content from the command line (same as wp-admin → Agency details → Demo content).
 *
 * Usage: docker compose run --rm wpcli wp eval-file /scripts/seed.php
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

foreach ( tac_import_sample_content() as $line ) {
	WP_CLI::log( $line );
}
WP_CLI::success( 'Demo content loaded.' );
