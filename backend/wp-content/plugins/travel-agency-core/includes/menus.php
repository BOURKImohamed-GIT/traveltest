<?php
/**
 * Menus edited in Appearance → Menus, served to the app at /travel/v1/menus.
 *
 * The MoroccoTravely theme registers three locations: primary (main menu with
 * dropdowns), quick (orange tab under the menu) and footer (footer "Useful links").
 * Menus are found by location, or by their demo name when not assigned yet.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Location => default menu name (created by the demo import). */
function tac_menu_defaults() {
	return array(
		'primary' => 'Main menu',
		'quick'   => 'Orange tab links',
		'footer'  => 'Footer links',
	);
}

function tac_menu_for_location( $location ) {
	$locations = get_nav_menu_locations();
	if ( ! empty( $locations[ $location ] ) ) {
		$menu = wp_get_nav_menu_object( $locations[ $location ] );
		if ( $menu ) {
			return $menu;
		}
	}
	$defaults = tac_menu_defaults();
	return isset( $defaults[ $location ] ) ? wp_get_nav_menu_object( $defaults[ $location ] ) : false;
}

/**
 * Link for a menu item, as an app path ("/tour/x/", "/search?category=y") when it's on this site.
 *
 * @return array{url: string, external: bool}
 */
function tac_menu_item_link( WP_Post $item ) {
	if ( 'taxonomy' === $item->type && 'tour_category' === $item->object ) {
		$term = get_term( (int) $item->object_id, 'tour_category' );
		if ( $term && ! is_wp_error( $term ) ) {
			return array( 'url' => '/search?category=' . $term->slug, 'external' => false );
		}
	}
	$url  = (string) $item->url;
	$home = untrailingslashit( home_url() );
	if ( '' === $url || '#' === $url ) {
		return array( 'url' => '', 'external' => false );
	}
	if ( 0 === strpos( $url, $home ) ) {
		$path = substr( $url, strlen( $home ) );
		return array( 'url' => '' === $path ? '/' : $path, 'external' => false );
	}
	if ( 0 === strpos( $url, '/' ) && 0 !== strpos( $url, '//' ) ) {
		return array( 'url' => $url, 'external' => false );
	}
	return array( 'url' => esc_url_raw( $url ), 'external' => true );
}

/**
 * Menu items as a tree: [{title, url, external, children}].
 */
function tac_menu_tree( $menu ) {
	$items = $menu ? wp_get_nav_menu_items( $menu->term_id, array( 'update_post_term_cache' => false ) ) : array();
	if ( ! $items ) {
		return null;
	}
	$nodes = array();
	foreach ( $items as $item ) {
		$link                 = tac_menu_item_link( $item );
		$nodes[ $item->ID ] = array(
			'title'    => tac_text( $item->title ),
			'url'      => $link['url'],
			'external' => $link['external'],
			'parent'   => (int) $item->menu_item_parent,
			'children' => array(),
		);
	}
	$tree = array();
	// Items come in menu order; attach children to their parents (two levels are shown).
	foreach ( $nodes as $id => &$node ) {
		if ( $node['parent'] && isset( $nodes[ $node['parent'] ] ) ) {
			$nodes[ $node['parent'] ]['children'][] = &$node;
		} else {
			$tree[] = &$node;
		}
	}
	unset( $node );
	$clean = function ( $list ) use ( &$clean ) {
		return array_map(
			function ( $n ) use ( $clean ) {
				return array(
					'title'    => $n['title'],
					'url'      => $n['url'],
					'external' => $n['external'],
					'children' => $clean( $n['children'] ),
				);
			},
			$list
		);
	};
	return $clean( $tree );
}

add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			'travel/v1',
			'/menus',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => function () {
					$out = array();
					foreach ( array_keys( tac_menu_defaults() ) as $location ) {
						$out[ $location ] = tac_menu_tree( tac_menu_for_location( $location ) );
					}
					return $out;
				},
				'permission_callback' => '__return_true',
			)
		);
	}
);

/* ---------- Demo menus ---------- */

/**
 * Create the three demo menus (if missing) and assign them to the theme's locations.
 *
 * @return string[] Log lines.
 */
function tac_create_demo_menus() {
	$log = array();

	$page = function ( $slug ) {
		$p = get_page_by_path( $slug );
		return $p ? (int) $p->ID : 0;
	};
	$term = function ( $slug ) {
		$t = get_term_by( 'slug', $slug, 'tour_category' );
		return $t ? (int) $t->term_id : 0;
	};
	$add = function ( $menu_id, $args, $parent = 0 ) {
		$args = array_merge( array( 'menu-item-status' => 'publish', 'menu-item-parent-id' => $parent ), $args );
		$id   = wp_update_nav_menu_item( $menu_id, 0, $args );
		return is_wp_error( $id ) ? 0 : (int) $id;
	};
	$custom = function ( $title, $path ) {
		return array( 'menu-item-type' => 'custom', 'menu-item-title' => $title, 'menu-item-url' => home_url( $path ) );
	};
	$page_item = function ( $title, $id ) {
		return array( 'menu-item-type' => 'post_type', 'menu-item-object' => 'page', 'menu-item-object-id' => $id, 'menu-item-title' => $title );
	};
	$term_item = function ( $title, $id ) {
		return array( 'menu-item-type' => 'taxonomy', 'menu-item-object' => 'tour_category', 'menu-item-object-id' => $id, 'menu-item-title' => $title );
	};

	$menus = array();
	foreach ( tac_menu_defaults() as $location => $name ) {
		$existing = wp_get_nav_menu_object( $name );
		if ( $existing ) {
			$menus[ $location ] = (int) $existing->term_id;
			$log[]              = "Menu kept (already exists): $name";
			continue;
		}
		$menu_id = wp_create_nav_menu( $name );
		if ( is_wp_error( $menu_id ) ) {
			continue;
		}
		$menus[ $location ] = (int) $menu_id;

		if ( 'primary' === $location ) {
			$add( $menu_id, $custom( 'Home', '/' ) );
			foreach ( array( 'tour-packages' => 'Destinations', 'day-trips' => 'Day Trips', 'activities' => 'Activities' ) as $slug => $title ) {
				$top_id = $term( $slug );
				if ( ! $top_id ) {
					continue;
				}
				$top      = $add( $menu_id, $term_item( $title, $top_id ) );
				$children = get_terms( array( 'taxonomy' => 'tour_category', 'parent' => $top_id, 'hide_empty' => false, 'orderby' => 'term_id' ) );
				foreach ( is_wp_error( $children ) ? array() : $children as $child ) {
					$add( $menu_id, $term_item( $child->name, $child->term_id ), $top );
				}
			}
			if ( $page( 'about-us' ) ) {
				$add( $menu_id, $page_item( 'About Us', $page( 'about-us' ) ) );
			}
		} elseif ( 'quick' === $location ) {
			$add( $menu_id, $custom( 'Home', '/' ) );
			if ( $page( 'about-us' ) ) {
				$add( $menu_id, $page_item( 'About Us', $page( 'about-us' ) ) );
			}
			$add( $menu_id, $custom( 'Contact Us', '/contact' ) );
			if ( $page( 'faqs' ) ) {
				$add( $menu_id, $page_item( 'FAQs', $page( 'faqs' ) ) );
			}
		} else {
			foreach ( array( 'about-us' => 'About Us', 'contact' => 'Contact Us', 'faqs' => 'FAQs', 'booking-cancellation-policy' => 'Booking & Cancellation Policy', 'privacy-policy' => 'Privacy Policy', 'terms-and-conditions' => 'Terms & Conditions' ) as $slug => $title ) {
				if ( 'contact' === $slug ) {
					$add( $menu_id, $custom( $title, '/contact' ) );
				} elseif ( $page( $slug ) ) {
					$add( $menu_id, $page_item( $title, $page( $slug ) ) );
				}
			}
		}
		$log[] = "Menu: $name";
	}

	tac_assign_demo_menus();
	return $log;
}

/**
 * Put the demo menus in the theme's empty menu locations (when the theme is active).
 */
function tac_assign_demo_menus() {
	$registered = get_registered_nav_menus();
	$locations  = get_nav_menu_locations();
	$changed    = false;
	foreach ( tac_menu_defaults() as $location => $name ) {
		$menu = wp_get_nav_menu_object( $name );
		if ( isset( $registered[ $location ] ) && empty( $locations[ $location ] ) && $menu ) {
			$locations[ $location ] = (int) $menu->term_id;
			$changed                = true;
		}
	}
	if ( $changed ) {
		set_theme_mod( 'nav_menu_locations', $locations );
	}
}

// Theme activated after the plugin: fill its menu locations with the demo menus.
add_action( 'after_switch_theme', 'tac_assign_demo_menus' );
