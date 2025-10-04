import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";

const Profile = ({ user, onEdit }) => {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    age: "",
    bio: "",
    picture: "",
    parentEmail: "",
    parentPhone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // Removed imageFile state - using Google profile images only
  const [formErrors, setFormErrors] = useState({});
  const isEditable = editMode && !loading;

  // Counselor state (if user is a counselor)
  const [counselorLoading, setCounselorLoading] = useState(false);
  const [counselorError, setCounselorError] = useState("");
  const [counselorSuccess, setCounselorSuccess] = useState("");
  const [counselorEditMode, setCounselorEditMode] = useState(false);
  const [counselorForm, setCounselorForm] = useState({
    name: user?.name || "",
    title: "Counselor",
    bio: "",
    price: "",
    prices: { chat: "", call: "", video: "" },
    currency: "INR",
    sessionTypes: ["Video Call", "Phone Call", "Chat"],
    specializations: [],
    languages: ["English"],
    image: "",
    availability: [],
  });

  // Fetch latest user info on mount
  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/user/profile?googleId=${user.googleId}`);
        if (!res.ok) throw new Error("Failed to fetch user info");
        const data = await res.json();
        setFormData({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          age: data.age || "",
          bio: data.bio || "",
          picture: data.picture || "",
          parentEmail: data.parentEmail || "",
          parentPhone: data.parentPhone || "",
        });
      } catch (err) {
        setError(err.message || "Error loading profile");
      } finally {
        setLoading(false);
      }
    };
    if (user?.googleId) fetchUser();
  }, [user?.googleId]);

  // Counselor form handlers
  const handleCounselorChange = (e) => {
    const { name, value } = e.target;
    setCounselorForm((prev) => {
      // Nested prices e.g., prices.chat
      if (name.startsWith("prices.")) {
        const key = name.split(".")[1];
        return {
          ...prev,
          prices: { ...prev.prices, [key]: value },
        };
      }
      // For text inputs that hold arrays in display, keep raw string; we'll parse on save
      return { ...prev, [name]: value };
    });
  };

  const toggleSessionType = (label) => {
    setCounselorForm((prev) => {
      const set = new Set(prev.sessionTypes || []);
      if (set.has(label)) set.delete(label);
      else set.add(label);
      return { ...prev, sessionTypes: Array.from(set) };
    });
  };

  const handleSaveCounselor = async () => {
    setCounselorLoading(true);
    setCounselorError("");
    setCounselorSuccess("");
    try {
      // Prepare payload
      const payload = {
        name: counselorForm.name || formData.name || "",
        title: counselorForm.title || "Counselor",
        bio: counselorForm.bio || "",
        price:
          counselorForm.price === "" || counselorForm.price === null
            ? null
            : Number(counselorForm.price),
        prices: {
          chat:
            counselorForm?.prices?.chat === "" ||
            counselorForm?.prices?.chat === null
              ? null
              : Number(counselorForm?.prices?.chat),
          call:
            counselorForm?.prices?.call === "" ||
            counselorForm?.prices?.call === null
              ? null
              : Number(counselorForm?.prices?.call),
          video:
            counselorForm?.prices?.video === "" ||
            counselorForm?.prices?.video === null
              ? null
              : Number(counselorForm?.prices?.video),
        },
        currency: counselorForm.currency || "INR",
        sessionTypes: Array.isArray(counselorForm.sessionTypes)
          ? counselorForm.sessionTypes
          : [],
        specializations: Array.isArray(counselorForm.specializations)
          ? counselorForm.specializations
          : String(counselorForm.specializations || "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
        languages: Array.isArray(counselorForm.languages)
          ? counselorForm.languages
          : String(counselorForm.languages || "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
        image: user.picture || "", // Use Google profile image for counselors
        availability: Array.isArray(counselorForm.availability)
          ? counselorForm.availability
          : String(counselorForm.availability || "")
              .split(/\n|\r/)
              .map((s) => s.trim())
              .filter(Boolean),
      };

      const res = await fetch("/api/counselors/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update counselor profile");

      const updated = await res.json();
      setCounselorForm((prev) => ({
        ...prev,
        name: updated.name || prev.name,
        title: updated.title || prev.title,
        bio: updated.bio ?? prev.bio,
        price: updated.price ?? prev.price,
        prices: {
          chat: (updated.prices && updated.prices.chat) ?? prev.prices.chat,
          call: (updated.prices && updated.prices.call) ?? prev.prices.call,
          video: (updated.prices && updated.prices.video) ?? prev.prices.video,
        },
        currency: updated.currency || prev.currency,
        sessionTypes:
          Array.isArray(updated.sessionTypes) && updated.sessionTypes.length
            ? updated.sessionTypes
            : prev.sessionTypes,
        specializations: updated.specializations ?? prev.specializations,
        languages: updated.languages ?? prev.languages,
        image: updated.image || prev.image,
        availability: updated.availability ?? prev.availability,
      }));

      setCounselorSuccess("Counselor profile updated successfully!");
      setCounselorEditMode(false);
      toast.success("Profile updated and broadcasted to all users!");

      // Show additional confirmation after a delay
      setTimeout(() => {
        toast.success("Your changes are now live across the platform!");
      }, 1500);
    } catch (e) {
      setCounselorError(e.message || "Error updating counselor profile");
      toast.error(e?.message || "Failed to update counselor profile");
    } finally {
      setCounselorLoading(false);
    }
  };

  // Fetch counselor profile if applicable
  useEffect(() => {
    if (!user?.isCounselor) return;
    let active = true;
    (async () => {
      try {
        setCounselorLoading(true);
        setCounselorError("");
        const res = await fetch("/api/counselors/me", {
          credentials: "include",
        });
        if (!res.ok) {
          if (res.status === 403) {
            setCounselorError("Access denied: Not authorized as counselor");
            return;
          }
          throw new Error("Failed to fetch counselor profile");
        }
        const c = await res.json();
        if (!active) return;
        setCounselorForm({
          name: c.name || user?.name || "",
          title: c.title || "Counselor",
          bio: c.bio || "",
          price: c.price ?? "",
          prices: {
            chat: (c.prices && c.prices.chat) ?? "",
            call: (c.prices && c.prices.call) ?? "",
            video: (c.prices && c.prices.video) ?? "",
          },
          currency: c.currency || "INR",
          sessionTypes:
            Array.isArray(c.sessionTypes) && c.sessionTypes.length
              ? c.sessionTypes
              : ["Video Call", "Phone Call", "Chat"],
          specializations: c.specializations || [],
          languages: c.languages || ["English"],
          image: c.image || formData.picture || "",
          availability: c.availability || [],
        });
      } catch (e) {
        if (active)
          setCounselorError(e.message || "Error loading counselor profile");
      } finally {
        if (active) setCounselorLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.isCounselor, formData.picture]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  // Removed handleImageChange - using Google profile images only

  const validateForm = () => {
    const errors = {};
    if (!formData.name?.trim()) errors.name = "Name is required";
    if (!formData.phone?.trim()) errors.phone = "Phone is required";
    if (
      formData.age &&
      (isNaN(formData.age) || formData.age < 1 || formData.age > 120)
    ) {
      errors.age = "Age must be between 1 and 120";
    }

    // Parent email validation (mandatory)
    if (!formData.parentEmail?.trim()) {
      errors.parentEmail =
        "Parent email is required for emergency notifications";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.parentEmail)) {
      errors.parentEmail = "Invalid email format";
    }

    // Parent phone validation (mandatory)
    if (!formData.parentPhone?.trim()) {
      errors.parentPhone = "Parent phone is required for SMS alerts";
    } else if (
      !/^\+?[\d\s\-\(\)]{10,15}$/.test(formData.parentPhone.replace(/\s/g, ""))
    ) {
      errors.parentPhone = "Invalid phone format (use +91 9876543210 format)";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    setEditMode(false);
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      if (!validateForm()) {
        setEditMode(true);
        setLoading(false);
        toast.error("Please fix the highlighted errors");
        return;
      }
      let pictureUrl = formData.picture;
      // If new image uploaded, upload to server (implement /api/user/upload-image if needed)
      // Use Google profile image - no custom upload needed
      // Update profile (ensure we don't save blob URLs)
      const profilePictureUrl = pictureUrl && !pictureUrl.startsWith('blob:') ? pictureUrl : '';
      
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleId: user.googleId,
          name: formData.name,
          phone: formData.phone,
          age: formData.age,
          bio: formData.bio,
          picture: user.picture, // Use Google profile image
          parentEmail: formData.parentEmail,
          parentPhone: formData.parentPhone,
        }),
      });
      if (!res.ok) throw new Error("Profile update failed");
      const updatedUser = await res.json();
      setFormData({
        name: updatedUser.name || "",
        email: updatedUser.email || "",
        phone: updatedUser.phone || "",
        age: updatedUser.age || "",
        bio: updatedUser.bio || "",
        picture: updatedUser.picture || "",
        parentEmail: updatedUser.parentEmail || "",
        parentPhone: updatedUser.parentPhone || "",
      });
      setSuccess("Profile updated successfully!");
      if (onEdit) onEdit(updatedUser);
      toast.success("Profile updated successfully");
    } catch (err) {
      setError(err.message || "Error updating profile");
      toast.error(err?.message || "Failed to update profile");
    } finally {
      setLoading(false);
      setImageFile(null);
    }
  };

  // For counselors, show only the professional profile
  if (user?.isCounselor) {
    return (
      <div className="min-h-[80vh] w-full bg-gradient-to-br from-emerald-50 to-teal-50 p-4 md:p-6">
        <div className="mx-auto max-w-6xl py-20">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-emerald-900 mb-2">
              Professional Counselor Profile
            </h1>
            <p className="text-gray-600">
              Manage your professional information visible to clients
            </p>
          </div>

          {/* Profile Picture Section */}
          <section className="bg-white rounded-2xl shadow-xl p-6 mb-6 text-slate-800">
            <div className="flex flex-col items-center">
              <div className="relative">
                <img
                  src={
                    user?.picture ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      counselorForm.name || user?.name || "C"
                    )}&background=10b981&color=fff&size=128`
                  }
                  alt="Counselor Profile"
                  className="rounded-full border-4 border-emerald-500 shadow-lg w-32 h-32 object-cover"
                />
                {/* Google profile image - no custom upload needed */}
              </div>
              <h2 className="mt-4 text-2xl font-bold text-emerald-900">
                {counselorForm.name || user?.name || "Counselor"}
              </h2>
              <p className="text-gray-600">
                {counselorForm.title || "Professional Counselor"}
              </p>
              {counselorForm.rating > 0 && (
                <div className="flex items-center mt-2">
                  <span className="text-yellow-500">★</span>
                  <span className="ml-1 text-gray-600">
                    {counselorForm.rating.toFixed(1)} (
                    {counselorForm.reviews || 0} reviews)
                  </span>
                </div>
              )}
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-xl p-6 text-slate-800">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-emerald-800">
                  Professional Information
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  This information will be visible to clients seeking counseling
                  services
                </p>
              </div>
              {!counselorEditMode ? (
                <button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg"
                  onClick={() => setCounselorEditMode(true)}
                  disabled={counselorLoading}
                >
                  Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                    onClick={handleSaveCounselor}
                    disabled={counselorLoading}
                  >
                    {counselorLoading ? "Saving..." : "Save"}
                  </button>
                  <button
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
                    onClick={() => setCounselorEditMode(false)}
                    disabled={counselorLoading}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {(counselorError || counselorSuccess) && (
              <div className="mb-4">
                {counselorError && (
                  <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2">
                    {counselorError}
                  </div>
                )}
                {counselorSuccess && (
                  <div className="text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    {counselorSuccess}
                  </div>
                )}
              </div>
            )}

            {counselorLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/3" />
                <div className="h-10 bg-gray-200 rounded" />
                <div className="h-6 bg-gray-200 rounded w-1/2" />
              </div>
            ) : (
              <form
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                onSubmit={(e) => e.preventDefault()}
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={counselorForm.name}
                    onChange={handleCounselorChange}
                    disabled={!counselorEditMode}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={counselorForm.title}
                    onChange={handleCounselorChange}
                    disabled={!counselorEditMode}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    rows={3}
                    value={counselorForm.bio}
                    onChange={handleCounselorChange}
                    disabled={!counselorEditMode}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Price (per session)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={counselorForm.price}
                    onChange={handleCounselorChange}
                    disabled={!counselorEditMode}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={counselorForm.currency}
                    onChange={handleCounselorChange}
                    disabled={!counselorEditMode}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chat Price
                  </label>
                  <input
                    type="number"
                    name="prices.chat"
                    value={counselorForm.prices.chat}
                    onChange={handleCounselorChange}
                    disabled={!counselorEditMode}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Call Price
                  </label>
                  <input
                    type="number"
                    name="prices.call"
                    value={counselorForm.prices.call}
                    onChange={handleCounselorChange}
                    disabled={!counselorEditMode}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Video Call Price
                  </label>
                  <input
                    type="number"
                    name="prices.video"
                    value={counselorForm.prices.video}
                    onChange={handleCounselorChange}
                    disabled={!counselorEditMode}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Session Types
                  </label>
                  <div className="flex gap-4">
                    {["Chat", "Phone Call", "Video Call"].map((label) => (
                      <label
                        key={label}
                        className="inline-flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={(counselorForm.sessionTypes || []).includes(
                            label
                          )}
                          onChange={() => toggleSessionType(label)}
                          disabled={!counselorEditMode}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specializations (comma separated)
                  </label>
                  <input
                    type="text"
                    name="specializations"
                    value={
                      Array.isArray(counselorForm.specializations)
                        ? counselorForm.specializations.join(", ")
                        : counselorForm.specializations
                    }
                    onChange={handleCounselorChange}
                    disabled={!counselorEditMode}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Languages (comma separated)
                  </label>
                  <input
                    type="text"
                    name="languages"
                    value={
                      Array.isArray(counselorForm.languages)
                        ? counselorForm.languages.join(", ")
                        : counselorForm.languages
                    }
                    onChange={handleCounselorChange}
                    disabled={!counselorEditMode}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Availability (one per line, e.g., "Mon 09:00-12:00" or
                    "2025-09-18 14:00-17:00")
                  </label>
                  <textarea
                    name="availability"
                    rows={4}
                    value={
                      (Array.isArray(counselorForm.availability)
                        ? counselorForm.availability.join("\n")
                        : counselorForm.availability) || ""
                    }
                    onChange={handleCounselorChange}
                    disabled={!counselorEditMode}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    );
  }

  // For regular users, show the standard profile
  return (
    <div className="min-h-[80vh] w-full bg-gradient-to-br from-emerald-50 to-teal-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6 py-20">
        {/* Left: Avatar & Basic Info */}
        <section className="lg:col-span-1 bg-white rounded-2xl shadow-xl p-6 relative text-slate-800">
          <div className="flex flex-col items-center">
            <div className="relative">
              <img
                src={
                  user?.picture ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    formData.name || "U"
                  )}&background=10b981&color=fff&size=128`
                }
                alt="Profile Avatar"
                className="rounded-full border-4 border-emerald-500 shadow-lg w-32 h-32 object-cover"
              />
              {/* Google profile image - no custom upload needed */}
            </div>
            <h2 className="mt-4 text-2xl font-bold text-emerald-900">
              {formData.name || "Your Name"}
            </h2>
            <p className="text-gray-500">{formData.email}</p>
            <div className="mt-4 flex gap-3">
              {!editMode ? (
                <button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-semibold shadow"
                  onClick={() => setEditMode(true)}
                  disabled={loading}
                >
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold shadow"
                    onClick={handleSave}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2 rounded-lg font-semibold shadow"
                    onClick={() => {
                      setEditMode(false);
                      setFormErrors({});
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Right: Details Form */}
        <section className="lg:col-span-2 bg-white rounded-2xl shadow-xl p-6 text-slate-800">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-emerald-800 mb-2">
              Profile Information
            </h3>
            <p className="text-gray-600 text-sm">
              Manage your account information and preferences
            </p>
          </div>
          {(error || success) && (
            <div className="mb-4">
              {error && (
                <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2">
                  {error}
                </div>
              )}
              {success && (
                <div className="text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  {success}
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/3" />
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-6 bg-gray-200 rounded w-1/2" />
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-6 bg-gray-200 rounded w-1/4" />
              <div className="h-24 bg-gray-200 rounded" />
            </div>
          ) : (
            <form
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (Google)
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-100 cursor-not-allowed text-slate-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Email (for alerts){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="parentEmail"
                  value={formData.parentEmail}
                  onChange={handleChange}
                  disabled={!isEditable}
                  placeholder="parent@example.com"
                  required
                  aria-invalid={!!formErrors.parentEmail}
                  aria-describedby="parentEmail-error"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 placeholder:text-slate-400 ${
                    formErrors.parentEmail
                      ? "border-red-400"
                      : "border-gray-200"
                  }`}
                />
                {formErrors.parentEmail && (
                  <p
                    id="parentEmail-error"
                    className="text-sm text-red-600 mt-1"
                  >
                    {formErrors.parentEmail}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Phone (for SMS alerts){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="parentPhone"
                  value={formData.parentPhone}
                  onChange={handleChange}
                  disabled={!isEditable}
                  placeholder="+91 9876543210"
                  required
                  aria-invalid={!!formErrors.parentPhone}
                  aria-describedby="parentPhone-error"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 placeholder:text-slate-400 ${
                    formErrors.parentPhone
                      ? "border-red-400"
                      : "border-gray-200"
                  }`}
                />
                {formErrors.parentPhone && (
                  <p
                    id="parentPhone-error"
                    className="text-sm text-red-600 mt-1"
                  >
                    {formErrors.parentPhone}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={!isEditable}
                  aria-invalid={!!formErrors.name}
                  aria-describedby="name-error"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 placeholder:text-slate-400 ${
                    formErrors.name ? "border-red-400" : "border-gray-200"
                  }`}
                />
                {formErrors.name && (
                  <p id="name-error" className="text-sm text-red-600 mt-1">
                    {formErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={!isEditable}
                  aria-invalid={!!formErrors.phone}
                  aria-describedby="phone-error"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 placeholder:text-slate-400 ${
                    formErrors.phone ? "border-red-400" : "border-gray-200"
                  }`}
                />
                {formErrors.phone && (
                  <p id="phone-error" className="text-sm text-red-600 mt-1">
                    {formErrors.phone}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  disabled={!isEditable}
                  aria-invalid={!!formErrors.age}
                  aria-describedby="age-error"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 placeholder:text-slate-400 ${
                    formErrors.age ? "border-red-400" : "border-gray-200"
                  }`}
                />
                {formErrors.age && (
                  <p id="age-error" className="text-sm text-red-600 mt-1">
                    {formErrors.age}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  disabled={!isEditable}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
};

export default Profile;
