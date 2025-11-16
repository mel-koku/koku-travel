// Complete data clearing script - run in browser console
// This signs out of Supabase AND clears all localStorage

(async function() {
  console.log("🧹 Starting complete data clear...\n");
  
  // Import Supabase client (if available)
  let supabase;
  try {
    // Try to get Supabase from window if it's available
    if (window.supabase) {
      supabase = window.supabase;
    } else {
      // Otherwise we'll just clear localStorage
      console.log("⚠️  Supabase client not found, clearing localStorage only");
    }
  } catch (e) {
    console.log("⚠️  Supabase client not available");
  }

  // Sign out if Supabase is available
  if (supabase) {
    try {
      await supabase.auth.signOut();
      console.log("✅ Signed out of Supabase");
    } catch (e) {
      console.log("⚠️  Could not sign out (may not be signed in)");
    }
  }

  // Clear all localStorage keys
  const keys = [
    "koku_app_state_v1",
    "koku_wishlist", 
    "koku_trip_builder",
    "koku_trip_step"
  ];

  const patterns = [
    "koku_community_replies_v1_",
    "koku_community_name"
  ];

  let count = 0;

  // Clear known keys
  keys.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log("✅ Cleared localStorage:", key);
      count++;
    }
  });

  // Clear pattern-based keys
  const allKeys = Object.keys(localStorage);
  allKeys.forEach(key => {
    if (patterns.some(p => key.startsWith(p)) || key.toLowerCase().includes("koku")) {
      localStorage.removeItem(key);
      console.log("✅ Cleared localStorage:", key);
      count++;
    }
  });

  // Clear Supabase session storage (if exists)
  try {
    const supabaseKeys = Object.keys(sessionStorage).filter(k => 
      k.toLowerCase().includes("supabase") || k.toLowerCase().includes("sb-")
    );
    supabaseKeys.forEach(key => {
      sessionStorage.removeItem(key);
      console.log("✅ Cleared sessionStorage:", key);
      count++;
    });
  } catch (e) {
    // Ignore
  }

  console.log(`\n✨ Cleared ${count} item(s)!`);
  console.log("🔄 Refreshing page in 2 seconds...");
  
  setTimeout(() => {
    window.location.reload();
  }, 2000);
})();

