import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./style.css";
import AdminDashboard from "./AdminDashboard";
import "./admin.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [shuttles, setShuttles] = useState([]);
  const [pickupPoints, setPickupPoints] = useState([]);
  const [selectedPickup, setSelectedPickup] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);

      if (data.session) {
        loadUser(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);

      if (newSession) {
        loadUser(newSession.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadUser(userId) {
    setLoading(true);

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    setProfile(data);
    await loadData();
    setLoading(false);
  }

  async function loadData() {
    const { data: points } = await supabase
      .from("pickup_points")
      .select("*")
      .eq("active", true)
      .order("name");

    setPickupPoints(points || []);

    const today = new Date().toISOString().slice(0, 10);

    const { data: shuttleData } = await supabase
      .from("shuttles")
      .select(`
        id,
        service_date,
        departure_time,
        status,
        available_seats,
        routes (
          name,
          origin,
          destination
        ),
        vehicles (
          plate_number,
          vehicle_type
        )
      `)
      .eq("service_date", today)
      .neq("status", "cancelled")
      .order("departure_time");

    setShuttles(shuttleData || []);
  }

  async function handleAuth(event) {
    event.preventDefault();
    setMessage("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) setMessage(error.message);
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Account created. Check your email if confirmation is required.");
      }
    }
  }

  async function bookShuttle(shuttleId) {
    if (!selectedPickup) {
      setMessage("Please select a pickup point first.");
      return;
    }

    setMessage("Booking...");

    const { error } = await supabase.rpc("book_shuttle", {
      p_shuttle_id: shuttleId,
      p_pickup_point_id: selectedPickup,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Booking successful! One seat has been reserved.");
    await loadData();
  }

  if (!supabase) {
    return (
      <div className="center">
        <div className="card">
          <h1>Smart Shuttle</h1>
          <p>Supabase will be connected after the website is uploaded.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="center">Loading Smart Shuttle...</div>;
  }
  if (!session) {
  return (
      <div className="center">
        <form className="card auth-card" onSubmit={handleAuth}>
          <div className="logo-circle">🚌</div>

          <h1>Smart Shuttle</h1>
          <p>Student transportation booking system</p>

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength="6"
          />

          <button type="submit">
            {mode === "login" ? "Login" : "Create Account"}
          </button>

          <button
            type="button"
            className="link-button"
            onClick={() =>
              setMode(mode === "login" ? "signup" : "login")
            }
          >
            {mode === "login"
              ? "Create a student account"
              : "Back to login"}
          </button>

          {message && <div className="message">{message}</div>}
        </form>
      </div>
    );
  }

if (profile?.role === "admin") {
  return <AdminDashboard supabase={supabase} />;
}

  return (
    <>
      <header>
        <strong>🚌 Smart Shuttle</strong>

        <button
          className="logout-button"
          onClick={() => supabase.auth.signOut()}
        >
          Logout
        </button>
      </header>

      <main>
        <section className="hero">
          <h1>
            Welcome
            {profile?.full_name ? `, ${profile.full_name}` : ""}
          </h1>

          <p>
            Book your campus shuttle quickly and avoid long queues.
          </p>
        </section>

        <section className="card">
          <h2>📍 Choose Pickup Point</h2>

          <select
            value={selectedPickup}
            onChange={(e) => setSelectedPickup(e.target.value)}
          >
            <option value="">Select pickup point</option>

            {pickupPoints.map((point) => (
              <option key={point.id} value={point.id}>
                {point.name} — ₦{point.fare}
              </option>
            ))}
          </select>
        </section>

        <section>
          <h2>🚍 Today's Shuttles</h2>

          {shuttles.length === 0 && (
            <div className="card">
              No shuttles are available today.
            </div>
          )}

          {shuttles.map((shuttle) => (
            <div className="card shuttle-card" key={shuttle.id}>
              <div>
                <h3>
                  {shuttle.routes?.name || "Campus Shuttle"}
                </h3>

                <p>
                  {shuttle.routes?.origin} →{" "}
                  {shuttle.routes?.destination}
                </p>

                <p>
                  🕐{" "}
                  <strong>
                    {String(shuttle.departure_time).slice(0, 5)}
                  </strong>
                </p>

                <p>
                  🚌 {shuttle.vehicles?.vehicle_type} ·{" "}
                  {shuttle.vehicles?.plate_number}
                </p>

                <p className="seats">
                  {shuttle.available_seats} seats available
                </p>
              </div>

              <button
                disabled={shuttle.available_seats < 1}
                onClick={() => bookShuttle(shuttle.id)}
              >
                {shuttle.available_seats < 1 ? "Full" : "Book Seat"}
              </button>
            </div>
          ))}
        </section>

        {message && <div className="message">{message}</div>}
      </main>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
