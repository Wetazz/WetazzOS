import { useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { api, getUser, STAFF_ROLES } from "@/lib/api";

import PublicLayout from "@/pages/public/PublicLayout";
import Home from "@/pages/public/Home";
import Services from "@/pages/public/Services";
import About from "@/pages/public/About";
import Contact from "@/pages/public/Contact";
import Shop from "@/pages/public/Shop";
import BookNow from "@/pages/public/BookNow";
import GetQuote from "@/pages/public/GetQuote";
import Login from "@/pages/public/Login";
import Signup from "@/pages/public/Signup";
import PaymentSuccess from "@/pages/public/PaymentSuccess";
import PaymentCancel from "@/pages/public/PaymentCancel";
import AssessorView from "@/pages/public/AssessorView";

import PortalLayout from "@/pages/portal/PortalLayout";
import PortalHome from "@/pages/portal/PortalHome";
import PortalVehicles from "@/pages/portal/PortalVehicles";
import PortalBookings from "@/pages/portal/PortalBookings";
import PortalJobs from "@/pages/portal/PortalJobs";
import PortalQuotes from "@/pages/portal/PortalQuotes";
import PortalInvoices from "@/pages/portal/PortalInvoices";
import PortalProfile from "@/pages/portal/PortalProfile";
import PortalMessages from "@/pages/portal/PortalMessages";
import PortalPayments from "@/pages/portal/PortalPayments";
import PortalDocuments from "@/pages/portal/PortalDocuments";

import OSLayout from "@/pages/os/OSLayout";
import OSDashboard from "@/pages/os/OSDashboard";
import OSCustomers from "@/pages/os/OSCustomers";
import OSVehicles from "@/pages/os/OSVehicles";
import OSBookings from "@/pages/os/OSBookings";
import OSJobsKanban from "@/pages/os/OSJobsKanban";
import OSJobDetail from "@/pages/os/OSJobDetail";
import OSJobPack from "@/pages/os/OSJobPack";
import OSQuotes from "@/pages/os/OSQuotes";
import OSInvoices from "@/pages/os/OSInvoices";
import OSInbox from "@/pages/os/OSInbox";
import OSReviews from "@/pages/os/OSReviews";
import OSStaff from "@/pages/os/OSStaff";
import OSAssistant from "@/pages/os/OSAssistant";
import OSParts from "@/pages/os/OSParts";
import OSSuppliers from "@/pages/os/OSSuppliers";
import OSCalendar from "@/pages/os/OSCalendar";
import OSAccounting from "@/pages/os/OSAccounting";
import OSCustomerDetail from "@/pages/os/OSCustomerDetail";
import OSVehicleDetail from "@/pages/os/OSVehicleDetail";
import OSLeads from "@/pages/os/OSLeads";

function Protected({ roles, children }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  useEffect(() => { api.post("/seed").catch(() => {}); }, []);
  return (
    <div className="App">
      <Toaster position="bottom-right" theme="dark" />
      <BrowserRouter>
        <Routes>
          {/* Public site */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/book" element={<BookNow />} />
            <Route path="/quote" element={<GetQuote />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancel" element={<PaymentCancel />} />
          </Route>
          <Route path="/assessor/:token" element={<AssessorView />} />
          <Route path="/portal" element={<Protected roles={["CUSTOMER"]}><PortalLayout /></Protected>}>
            <Route index element={<PortalHome />} />
            <Route path="vehicles" element={<PortalVehicles />} />
            <Route path="bookings" element={<PortalBookings />} />
            <Route path="jobs" element={<PortalJobs />} />
            <Route path="quotes" element={<PortalQuotes />} />
            <Route path="invoices" element={<PortalInvoices />} />
            <Route path="profile" element={<PortalProfile />} />
            <Route path="messages" element={<PortalMessages />} />
            <Route path="payments" element={<PortalPayments />} />
            <Route path="documents" element={<PortalDocuments />} />
          </Route>

          {/* Staff OS */}
          <Route path="/os" element={<Protected roles={STAFF_ROLES}><OSLayout /></Protected>}>
            <Route index element={<OSDashboard />} />
            <Route path="customers" element={<OSCustomers />} />
            <Route path="customers/:cid" element={<OSCustomerDetail />} />
            <Route path="vehicles" element={<OSVehicles />} />
            <Route path="vehicles/:vid" element={<OSVehicleDetail />} />
            <Route path="leads" element={<OSLeads />} />
            <Route path="bookings" element={<OSBookings />} />
            <Route path="jobs" element={<OSJobsKanban />} />
            <Route path="jobs/:jid" element={<OSJobDetail />} />
            <Route path="jobs/:jid/pack" element={<OSJobPack />} />
            <Route path="quotes" element={<OSQuotes />} />
            <Route path="invoices" element={<OSInvoices />} />
            <Route path="inbox" element={<OSInbox />} />
            <Route path="reviews" element={<OSReviews />} />
            <Route path="staff" element={<OSStaff />} />
            <Route path="assistant" element={<OSAssistant />} />
            <Route path="parts" element={<OSParts />} />
            <Route path="suppliers" element={<OSSuppliers />} />
            <Route path="calendar" element={<OSCalendar />} />
            <Route path="accounting" element={<OSAccounting />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}
