
import { useEffect, useState } from "react";
import api from "./api";
import "./App.css";

function App() {
 

  const goToDashboard = () => {
    setPage("products");
  };

  // Existing code continues below...
  const [token, setToken] = useState(localStorage.getItem("nexora_token"));
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("nexora_user") || "null")
  );

  const [page, setPage] = useState("products");
  const [authPage, setAuthPage] = useState("login");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [loginData, setLoginData] = useState({
    orgId: "",
    email: "",
    password: ""
  });

  const [signupData, setSignupData] = useState({
    orgId: "",
    orgName: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    country: "India"
  });

  const [products, setProducts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [orders, setOrders] = useState([]);

  const [productData, setProductData] = useState({
    productName: "",
    sku: "",
    description: "",
    price: "",
    stockQuantity: 0
  });

  const [employeeData, setEmployeeData] = useState({
    employeeCode: "",
    fullName: "",
    email: "",
    password: "",
    phone: "",
    department: "",
    designation: "",
    roleName: "INVENTORY_MANAGER"
  });

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const canManageProducts = ["SUPER_ADMIN", "INVENTORY_MANAGER"].includes(user?.role);
  const canViewOrders = ["SUPER_ADMIN", "INVENTORY_MANAGER", "ACCOUNT_MANAGER"].includes(user?.role);

  useEffect(() => {
    if (token) loadPageData(page);
  }, [token, page]);

  async function loadPageData(selectedPage) {
    setMessage("");

    try {
      if (selectedPage === "products" && canManageProducts) {
        const response = await api.get("/products");
        setProducts(response.data.products || []);
      }

      if (selectedPage === "employees" && isSuperAdmin) {
        const response = await api.get("/employees");
        setEmployees(response.data.employees || []);
      }

      if (selectedPage === "orders" && canViewOrders) {
        const response = await api.get("/orders");
        setOrders(response.data.orders || []);
      }
    } catch (error) {
  console.error("Signup error:", error.response?.data || error);

  setMessage(
    error.response?.data?.message ||
    error.message ||
    "Signup failed. Please try again."
  );
}
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await api.post("/auth/login", loginData);
      const newToken = response.data.token;
      const newUser = response.data.user;

      localStorage.setItem("nexora_token", newToken);
      localStorage.setItem("nexora_user", JSON.stringify(newUser));

      setToken(newToken);
      setUser(newUser);
      setPage("products");
      setMessage("Login successful!");
    } catch (error) {
      setMessage(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await api.post("/organizations/signup", signupData);
      setMessage("Organization registered! Please log in.");
      setAuthPage("login");
      setLoginData({
        orgId: signupData.orgId,
        email: signupData.email,
        password: ""
      });
    } catch (error) {
      setMessage(error.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("nexora_token");
    localStorage.removeItem("nexora_user");
    setToken(null);
    setUser(null);
    setProducts([]);
    setEmployees([]);
    setOrders([]);
    setMessage("");
  }

  async function createProduct(event) {
    event.preventDefault();
    setLoading(true);

    try {
      await api.post("/products", {
        ...productData,
        price: Number(productData.price),
        stockQuantity: Number(productData.stockQuantity)
      });

      setProductData({
        productName: "",
        sku: "",
        description: "",
        price: "",
        stockQuantity: 0
      });

      setMessage("Product created successfully!");
      await loadPageData("products");
    } catch (error) {
      setMessage(error.response?.data?.message || "Product creation failed");
    } finally {
      setLoading(false);
    }
  }

  async function publishProduct(productId) {
    try {
      await api.patch(`/products/${productId}/publish`);
      setMessage("Product published successfully!");
      await loadPageData("products");
    } catch (error) {
      setMessage(error.response?.data?.message || "Publishing failed");
    }
  }

  async function createEmployee(event) {
    event.preventDefault();
    setLoading(true);

    try {
      await api.post("/employees", employeeData);

      setEmployeeData({
        employeeCode: "",
        fullName: "",
        email: "",
        password: "",
        phone: "",
        department: "",
        designation: "",
        roleName: "INVENTORY_MANAGER"
      });

      setMessage("Employee created successfully!");
      await loadPageData("employees");
    } catch (error) {
      setMessage(error.response?.data?.message || "Employee creation failed");
    } finally {
      setLoading(false);
    }
  }

  async function updateOrder(orderId, orderStatus) {
    try {
      await api.patch(`/orders/${orderId}/status`, { orderStatus });
      setMessage("Order status updated!");
      await loadPageData("orders");
    } catch (error) {
      setMessage(error.response?.data?.message || "Order update failed");
    }
  }

  if (!token || !user) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="brand-mark">N</div>
          <h1>Nexora</h1>
          <p className="muted">Your business, organized.</p>

          <div className="auth-switch">
            <button
              className={authPage === "login" ? "active" : ""}
              onClick={() => { setAuthPage("login"); setMessage(""); }}
            >
              Login
            </button>
            <button
              className={authPage === "signup" ? "active" : ""}
              onClick={() => { setAuthPage("signup"); setMessage(""); }}
            >
              Sign up
            </button>
          </div>

          {message && <p className="message">{message}</p>}

          {authPage === "login" ? (
            <form onSubmit={handleLogin}>
              <label>Organization ID</label>
              <input required value={loginData.orgId}
                onChange={e => setLoginData({...loginData, orgId:e.target.value})}
                placeholder="NEXORA001" />

              <label>Email</label>
              <input required type="email" value={loginData.email}
                onChange={e => setLoginData({...loginData, email:e.target.value})}
                placeholder="you@company.com" />

              <label>Password</label>
              <input required type="password" value={loginData.password}
                onChange={e => setLoginData({...loginData, password:e.target.value})}
                placeholder="Enter password" />

              <button className="primary full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup}>
              {[
                ["orgId", "Organization ID"],
                ["orgName", "Organization name"],
                ["fullName", "Your full name"],
                ["email", "Email"]
              ].map(([key, label]) => (
                <div key={key}>
                  <label>{label}</label>
                  <input required type={key === "email" ? "email" : "text"}
                    value={signupData[key]}
                    onChange={e => setSignupData({...signupData, [key]:e.target.value})} />
                </div>
              ))}

              <label>Password</label>
              <input required type="password" minLength="8"
                value={signupData.password}
                onChange={e => setSignupData({...signupData, password:e.target.value})} />

              <label>Confirm password</label>
              <input required type="password"
                value={signupData.confirmPassword}
                onChange={e => setSignupData({...signupData, confirmPassword:e.target.value})} />

              <label>Country</label>
              <input required value={signupData.country}
                onChange={e => setSignupData({...signupData, country:e.target.value})} />

              <button className="primary full" disabled={loading}>
                {loading ? "Creating organization..." : "Create organization"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const navItems = [
    ...(canManageProducts ? [{id:"products", label:"Products"}] : []),
    ...(isSuperAdmin ? [{id:"employees", label:"Employees"}] : []),
    ...(canViewOrders ? [{id:"orders", label:"Orders"}] : []),
    {id:"subscription", label:"Subscription"}
  ];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand"><span>N</span> Nexora</div>
        <p className="side-caption">WORKSPACE</p>

        {navItems.map(item => (
          <button key={item.id}
            className={`nav-button ${page === item.id ? "selected" : ""}`}
            onClick={() => {setPage(item.id); setMessage("");}}>
            {item.label}
          </button>
        ))}

        <div className="sidebar-bottom">
          <strong>{user.fullName}</strong>
          <small>{user.role?.replaceAll("_", " ")}</small>
          <button className="logout-button" onClick={logout}>Sign out</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="muted">Organization: {user.orgId}</p>
            <h2>{page.charAt(0).toUpperCase() + page.slice(1)}</h2>
          </div>
          <span className="role-tag">{user.role?.replaceAll("_", " ")}</span>
        </header>

        {message && <div className="message">{message}</div>}

        {page === "products" && canManageProducts && (
          <>
            <section className="panel">
              <h3>Add new product</h3>
              <form className="data-form" onSubmit={createProduct}>
                <input required placeholder="Product name"
                  value={productData.productName}
                  onChange={e=>setProductData({...productData,productName:e.target.value})}/>
                <input placeholder="SKU"
                  value={productData.sku}
                  onChange={e=>setProductData({...productData,sku:e.target.value})}/>
                <input placeholder="Description"
                  value={productData.description}
                  onChange={e=>setProductData({...productData,description:e.target.value})}/>
                <input required type="number" min="0" placeholder="Price"
                  value={productData.price}
                  onChange={e=>setProductData({...productData,price:e.target.value})}/>
                <input type="number" min="0" placeholder="Stock quantity"
                  value={productData.stockQuantity}
                  onChange={e=>setProductData({...productData,stockQuantity:e.target.value})}/>
                <button className="primary" disabled={loading}>Add product</button>
              </form>
            </section>

            <section className="panel">
              <div className="section-heading">
                <h3>Product inventory</h3>
                <button className="secondary" onClick={()=>loadPageData("products")}>Refresh</button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>ID</th><th>Product</th><th>SKU</th><th>Price</th><th>Stock</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {products.map(product=>(
                      <tr key={product.product_id}>
                        <td>{product.product_id}</td>
                        <td>{product.product_name}</td>
                        <td>{product.sku || "-"}</td>
                        <td>₹{Number(product.price).toLocaleString("en-IN")}</td>
                        <td>{product.stock_quantity}</td>
                        <td><span className="status">{product.product_status}</span></td>
                        <td>
                          {product.product_status !== "PUBLISHED" &&
                            <button className="small-action" onClick={()=>publishProduct(product.product_id)}>Publish</button>}
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && <tr><td colSpan="7">No products found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {page === "employees" && isSuperAdmin && (
          <>
            <section className="panel">
              <h3>Add employee</h3>
              <form className="data-form" onSubmit={createEmployee}>
                <input required placeholder="Employee code" value={employeeData.employeeCode}
                  onChange={e=>setEmployeeData({...employeeData,employeeCode:e.target.value})}/>
                <input required placeholder="Full name" value={employeeData.fullName}
                  onChange={e=>setEmployeeData({...employeeData,fullName:e.target.value})}/>
                <input required type="email" placeholder="Email" value={employeeData.email}
                  onChange={e=>setEmployeeData({...employeeData,email:e.target.value})}/>
                <input required type="password" minLength="8" placeholder="Temporary password" value={employeeData.password}
                  onChange={e=>setEmployeeData({...employeeData,password:e.target.value})}/>
                <input placeholder="Phone" value={employeeData.phone}
                  onChange={e=>setEmployeeData({...employeeData,phone:e.target.value})}/>
                <input placeholder="Department" value={employeeData.department}
                  onChange={e=>setEmployeeData({...employeeData,department:e.target.value})}/>
                <input placeholder="Designation" value={employeeData.designation}
                  onChange={e=>setEmployeeData({...employeeData,designation:e.target.value})}/>
                <select value={employeeData.roleName}
                  onChange={e=>setEmployeeData({...employeeData,roleName:e.target.value})}>
                  <option value="INVENTORY_MANAGER">Inventory Manager</option>
                  <option value="ACCOUNT_MANAGER">Account Manager</option>
                </select>
                <button className="primary" disabled={loading}>Create employee</button>
              </form>
            </section>

            <section className="panel">
              <div className="section-heading">
                <h3>Employees</h3>
                <button className="secondary" onClick={()=>loadPageData("employees")}>Refresh</button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Department</th><th>Role</th><th>Status</th></tr></thead>
                  <tbody>
                    {employees.map(employee=>(
                      <tr key={employee.employee_id}>
                        <td>{employee.employee_id}</td>
                        <td>{employee.full_name}</td>
                        <td>{employee.email}</td>
                        <td>{employee.department || "-"}</td>
                        <td>{employee.role_name || "-"}</td>
                        <td>{employee.employment_status}</td>
                      </tr>
                    ))}
                    {employees.length === 0 && <tr><td colSpan="6">No employees found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {page === "orders" && canViewOrders && (
          <section className="panel">
            <div className="section-heading">
              <h3>Order history</h3>
              <button className="secondary" onClick={()=>loadPageData("orders")}>Refresh</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Update status</th></tr></thead>
                <tbody>
                  {orders.map(order=>(
                    <tr key={order.order_id}>
                      <td>{order.order_number}</td>
                      <td>{order.customer_name || "-"}</td>
                      <td>₹{Number(order.total_amount).toLocaleString("en-IN")}</td>
                      <td>{order.order_status}</td>
                      <td>
                        <select value={order.order_status}
                          onChange={e=>updateOrder(order.order_id,e.target.value)}>
                          {["PLACED","PROCESSED","READY_TO_SHIP","SHIPPED","DELIVERED","CANCELLED"].map(status=><option key={status}>{status}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && <tr><td colSpan="5">No orders yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {page === "subscription" && (
          <section className="panel">
            <h3>Subscription</h3>
            <div className="subscription-card">
              <p>Current plan</p>
              <h2>14-Day Free Trial</h2>
              <p className="muted">Your organization was registered with a trial subscription.</p>
              <p>Organization: <strong>{user.orgId}</strong></p>
              <p>Plan: <strong>TRIAL</strong></p>
              <p className="muted">Subscription management API and billing integration are not yet connected.</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;

