import React, { useEffect, useState } from "react";

export default function AdminDashboard({ supabase }) {
  const [summary, setSummary] = useState(null);
  const [students, setStudents] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [shuttles, setShuttles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setMessage("");

    const { data: summaryData, error: summaryError } =
      await supabase.rpc("admin_dashboard_summary");

    if (summaryError) {
      setMessage(summaryError.message);
    } else {
      setSummary(summaryData);
    }

    const { data: studentData } = await supabase
      .from("profiles")
      .select("id, full_name, matric_number, institution, department, phone, role, verified")
      .eq("role", "student")
      .order("full_name");

    const { data: vehicleData } = await supabase
      .from("vehicles")
      .select(`
        id,
        plate_number,
        vehicle_type,
        capacity,
        verified,
        active,
        driver_id,
        profiles:driver_id (
          full_name,
          phone
        )
      `)
      .order("plate_number");

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
      .order("service_date", { ascending: false })
      .order("departure_time");

    const { data: bookingData } = await supabase
      .from("bookings")
      .select(`
        id,
        seat_number,
        fare,
        status,
        booked_at,
        profiles:student_id (
          full_name,
          matric_number
        ),
        pickup_points (
          name
        ),
        shuttles (
          service_date,
          departure_time,
          routes (
            name
          )
        )
      `)
      .order("booked_at", { ascending: false })
      .limit(50);

    setStudents(studentData || []);
    setVehicles(vehicleData || []);
    setShuttles(shuttleData || []);
    setBookings(bookingData || []);

    setLoading(false);
  }

  async function verifyStudent(id) {
    const { error } = await supabase
      .from("profiles")
      .update({ verified: true })
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Student verified successfully.");
    await loadDashboard();
  }

  async function verifyVehicle(id) {
    const { error } = await supabase
      .from("vehicles")
      .update({ verified: true })
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Vehicle verified successfully.");
    await loadDashboard();
  }

  if (loading) {
    return <div className="admin-page">Loading admin dashboard...</div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-heading">
        <div>
          <h1>📊 Admin Dashboard</h1>
          <p>Smart Shuttle transportation management</p>
        </div>

        <button onClick={loadDashboard}>Refresh</button>
      </div>

      {message && <div className="message">{message}</div>}

      <section className="stats-grid">
        <div className="stat-card">
          <span>👥 Students</span>
          <strong>{summary?.students ?? students.length}</strong>
        </div>

        <div className="stat-card">
          <span>🚍 Vehicles</span>
          <strong>{summary?.vehicles ?? vehicles.length}</strong>
        </div>

        <div className="stat-card">
          <span>🚐 Shuttles</span>
          <strong>{summary?.shuttles ?? shuttles.length}</strong>
        </div>

        <div className="stat-card">
          <span>🎫 Bookings</span>
          <strong>{summary?.bookings ?? bookings.length}</strong>
        </div>
      </section>

      <section className="admin-card">
        <h2>👥 Students</h2>

        {students.length === 0 ? (
          <p>No students found.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Matric No.</th>
                  <th>Department</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>{student.full_name || "—"}</td>
                    <td>{student.matric_number || "—"}</td>
                    <td>{student.department || "—"}</td>
                    <td>{student.phone || "—"}</td>
                    <td>
                      {student.verified ? "✅ Verified" : "⏳ Pending"}
                    </td>
                    <td>
                      {!student.verified && (
                        <button onClick={() => verifyStudent(student.id)}>
                          Verify
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-card">
        <h2>🚍 Vehicles & Drivers</h2>

        {vehicles.length === 0 ? (
          <p>No vehicles found.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Plate</th>
                  <th>Vehicle</th>
                  <th>Capacity</th>
                  <th>Driver</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td>{vehicle.plate_number}</td>
                    <td>{vehicle.vehicle_type}</td>
                    <td>{vehicle.capacity}</td>
                    <td>{vehicle.profiles?.full_name || "—"}</td>
                    <td>
                      {vehicle.verified ? "✅ Verified" : "⏳ Pending"}
                    </td>
                    <td>
                      {!vehicle.verified && (
                        <button onClick={() => verifyVehicle(vehicle.id)}>
                          Verify
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-card">
        <h2>🚐 Shuttles</h2>

        {shuttles.length === 0 ? (
          <p>No shuttles found.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Route</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th>Seats</th>
                </tr>
              </thead>

              <tbody>
                {shuttles.map((shuttle) => (
                  <tr key={shuttle.id}>
                    <td>{shuttle.service_date}</td>
                    <td>{String(shuttle.departure_time).slice(0, 5)}</td>
                    <td>{shuttle.routes?.name || "—"}</td>
                    <td>{shuttle.vehicles?.plate_number || "—"}</td>
                    <td>{shuttle.status}</td>
                    <td>{shuttle.available_seats}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-card">
        <h2>🎫 Recent Bookings</h2>

        {bookings.length === 0 ? (
          <p>No bookings found.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Pickup</th>
                  <th>Route</th>
                  <th>Seat</th>
                  <th>Fare</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      {booking.profiles?.full_name || "—"}
                      <br />
                      <small>
                        {booking.profiles?.matric_number || ""}
                      </small>
                    </td>

                    <td>{booking.pickup_points?.name || "—"}</td>

                    <td>{booking.shuttles?.routes?.name || "—"}</td>

                    <td>{booking.seat_number || "—"}</td>

                    <td>₦{booking.fare}</td>

                    <td>{booking.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
      }
