import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useParams, useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";


import {
  addVenueCategoryWhyThisVenue,
  updateVenueCategoryWhyThisVenue,
  fetchVenueCategoryWhyThisVenueByGuid,
  deleteVenueCategoryWhyThisVenue,
} from "../../services/venueCategoryWhyThisVenueServices";
import {
  fetchVenueCategoryPageByGuid,
  updateVenueCategoryPage,
} from "../../services/venueCategoryPageServices";
import { handleErrors } from "../../utils/errorHandler";
import { confirmDelete } from "../Common/OtherElements/confirmDeleteClone";
import { Loading } from "../Common/OtherElements/Loading";
import { TableDataStatusError } from "../Common/OtherElements/TableDataStatusError";
import TableHeader from "../Common/TableComponent/TableHeader";
import { Editor } from "@tinymce/tinymce-react";
import { getTinyMceInit } from "../../utils/tinymceConfig";

// NOTE: replace with your own TinyMCE Cloud API key, or switch to a
// self-hosted TinyMCE bundle if you don't want to depend on the cloud CDN.

const initialWhyFormState = {
  Id: null,
  Title: "",
  Description: "",
  DisplayOrder: 0,
};

// Section5 Title / Desc used to live on the main Venue Category Page form
// (as WhyTitle / WhyDescription). They're edited here since they're
// displayed alongside the "Why choose this venue" items on the venue page.
// This section has no image.
const initialSectionFormState = {
  Section5Title: "",
  Section5Desc: "",
};

export const ManageVenueCategoryWhyThisVenue = () => {
  const { venueCategoryGuid } = useParams();
  const navigate = useNavigate();

  const [whyItems, setWhyItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(initialWhyFormState);
  const [errors, setErrors] = useState({});
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  // Page-level "Section5" content.
  const [pageRecord, setPageRecord] = useState(null);
  const [sectionFormData, setSectionFormData] = useState(initialSectionFormState);
  const [sectionErrors, setSectionErrors] = useState({});
  const [sectionLoading, setSectionLoading] = useState(true);
  const [isSectionSaving, setIsSectionSaving] = useState(false);

  const loadWhyItems = async () => {
    setLoading(true);
    try {
      const result = await fetchVenueCategoryWhyThisVenueByGuid(venueCategoryGuid);
      setWhyItems(result || []);
    } catch (error) {
      handleErrors(error);
    } finally {
      setLoading(false);
    }
  };

  const loadSection = async () => {
    setSectionLoading(true);
    try {
      const data = await fetchVenueCategoryPageByGuid(venueCategoryGuid);
      if (data) {
        setPageRecord(data);
        setSectionFormData({
          Section5Title: data.section5Title || "",
          Section5Desc: data.section5Desc || "",
        });
      }
    } catch (error) {
      handleErrors(error);
    } finally {
      setSectionLoading(false);
    }
  };

  useEffect(() => {
    loadWhyItems();
    loadSection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueCategoryGuid]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
    setErrors((prevErrors) => ({ ...prevErrors, [name]: "" }));
  };

  const resetForm = () => {
    setFormData(initialWhyFormState);
    setErrors({});
  };

  const validate = () => {
    const newErrors = {};
    let valid = true;

    if (!formData.Title?.trim()) {
      newErrors.Title = "Title is required";
      valid = false;
    }
    if (!formData.Description?.trim()) {
      newErrors.Description = "Description is required";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  // Why-this-venue item add/update take a plain JSON body (no file fields).
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setIsButtonDisabled(true);
    try {
      if (formData.Id) {
        await updateVenueCategoryWhyThisVenue({
          id: formData.Id,
          title: formData.Title,
          description: formData.Description,
          displayOrder: formData.DisplayOrder || 0,
        });
        toast.success("Why Choose item updated successfully!");
      } else {
        await addVenueCategoryWhyThisVenue({
          venueCategoryGuid,
          title: formData.Title,
          description: formData.Description,
          displayOrder: formData.DisplayOrder || 0,
        });
        toast.success("Why Choose item added successfully!");
      }
      resetForm();
      loadWhyItems();
    } catch (error) {
      handleErrors(error);
    } finally {
      setIsButtonDisabled(false);
    }
  };

  const handleEdit = (item) => {
    setFormData({
      Id: item.id,
      Title: item.title || "",
      Description: item.description || "",
      DisplayOrder: item.displayOrder ?? 0,
    });
    setErrors({});
  };

  const handleDelete = async (id) => {
    const confirmed = await confirmDelete("Why Choose Item");
    if (confirmed) {
      try {
        await deleteVenueCategoryWhyThisVenue(id);
        setWhyItems((prev) => prev.filter((item) => item.id !== id));
        Swal.fire("Deleted!", "The item has been deleted successfully.", "success");
      } catch (error) {
        handleErrors(error);
      }
    }
  };

  // --- Section5 (page-level) handlers ---

  const handleSectionInputChange = (e) => {
    const { name, value } = e.target;
    setSectionFormData((prevData) => ({ ...prevData, [name]: value }));
    setSectionErrors((prevErrors) => ({ ...prevErrors, [name]: "" }));
  };

  // TinyMCE's onEditorChange gives back the HTML content directly (no
  // event object), so it needs its own handler instead of reusing
  // handleSectionInputChange.
  const handleSection5DescChange = (content) => {
    setSectionFormData((prevData) => ({ ...prevData, Section5Desc: content }));
    setSectionErrors((prevErrors) => ({ ...prevErrors, Section5Desc: "" }));
  };

  const validateSection = () => {
    const newErrors = {};
    let valid = true;

    if (!sectionFormData.Section5Title?.trim()) {
      newErrors.Section5Title = "Title is required";
      valid = false;
    }
    // TinyMCE returns "<p>&nbsp;</p>" style markup for an "empty" editor,
    // so strip tags before checking for actual content.
    const plainDesc = (sectionFormData.Section5Desc || "")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, "")
      .trim();
    if (!plainDesc) {
      newErrors.Section5Desc = "Description is required";
      valid = false;
    }

    setSectionErrors(newErrors);
    return valid;
  };

  // The update endpoint expects the whole page record, so the rest of the
  // fields are carried over unchanged from what was last fetched, and only
  // the Section5 fields are overridden. This section has no image.
  const handleSectionSubmit = async (e) => {
    e.preventDefault();

    if (!pageRecord) return;
    if (!validateSection()) return;

    setIsSectionSaving(true);
    try {
      const payload = new FormData();
      payload.append("Id", pageRecord.id);
      payload.append("VenueCategoryId", pageRecord.venueCategoryId);
      payload.append("BannerTitle", pageRecord.bannerTitle || "");
      payload.append("BannerImage", pageRecord.bannerImage || "");
      payload.append("Section1Title", pageRecord.section1Title || "");
      payload.append("Section1Desc", pageRecord.section1Desc || "");
      payload.append("Section1Image", pageRecord.section1Image || "");
      payload.append("Section2Title", pageRecord.section2Title || "");
      payload.append("Section2Desc", pageRecord.section2Desc || "");
      payload.append("Section2Image", pageRecord.section2Image || "");
      payload.append("Section3Title", sectionFormData.Section3Title);
      payload.append("Section3Desc", sectionFormData.Section3Desc);
      payload.append("Section3Image", pageRecord.section3Image || "");
      payload.append("Section4Title", pageRecord.section4Title || "");
      payload.append("Section5Title", sectionFormData.Section5Title);
      payload.append("Section5Desc", sectionFormData.Section5Desc);
      payload.append("FaqDesc", pageRecord.faqDesc || "");
      payload.append("CtaTitle", pageRecord.ctaTitle || "");
      payload.append("CtaSubTitle", pageRecord.ctaSubTitle || "");
      payload.append("CtaDesc", pageRecord.ctaDesc || "");
      payload.append("CtaButtonText", pageRecord.ctaButtonText || "");
      payload.append("PageTitle", pageRecord.pageTitle || "");
      payload.append("MetaKey", pageRecord.metaKey || "");
      payload.append("MetaDesc", pageRecord.metaDesc || "");
       payload.append("OgTitle", pageRecord.ogTitle);
payload.append("OgDesc", pageRecord.ogDesc);
payload.append("SchemaMarkup",pageRecord.schemaMarkup ||"")
      await updateVenueCategoryPage(payload);
      toast.success("Why Choose section updated successfully!");
      loadSection();
    } catch (error) {
      handleErrors(error);
    } finally {
      setIsSectionSaving(false);
    }
  };

  return (
    <>
      <div className="row">
        <div className="col-12">
          <div className="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 className="mb-sm-0">Venue Category Why Choose Section</h4>
            <div className="page-title-right">
              <ol className="breadcrumb m-0">
                <li className="breadcrumb-item">
                  <Link to="/">
                    <i className="ri-home-2-fill"></i>
                  </Link>
                </li>
                <li className="breadcrumb-item">
                  <Link to="/venue-category-pages">Manage Venue Category Pages</Link>
                </li>
                <li className="breadcrumb-item">Why Choose</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div className="card-body p-2">
        <div className="card mt-xxl-n5 p-3">
          <div className="card-header-wrapper p-1">
            <h5 className="blogs-heading">Why Choose Section (Section 5)</h5>
          </div>
          {sectionLoading ? (
            <Loading />
          ) : (
            <form onSubmit={handleSectionSubmit} className="mt-3">
              <div className="mb-3">
                <label className="form-label">
                  Section 5 Title <span className="required-field">*</span>
                </label>
                <input
                  type="text"
                  name="Section5Title"
                  value={sectionFormData.Section5Title}
                  placeholder="Enter Section 5 Title"
                  onChange={handleSectionInputChange}
                  className={`form-control ${sectionErrors.Section5Title ? "is-invalid" : ""}`}
                />
                {sectionErrors.Section5Title && (
                  <div className="invalid-feedback">{sectionErrors.Section5Title}</div>
                )}
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Section 5 Description <span className="required-field">*</span>
                </label>
              <Editor
  tinymceScriptSrc="/tinymce/tinymce.min.js"
  value={sectionFormData.Section5Desc}
  onEditorChange={handleSection5DescChange}
  init={getTinyMceInit({ height: 300 })}
/>
                {sectionErrors.Section5Desc && (
                  <div className="invalid-feedback d-block">{sectionErrors.Section5Desc}</div>
                )}
              </div>

              <button type="submit" className="btn btn-secondary" disabled={isSectionSaving}>
                {isSectionSaving ? "Saving" : "Save Why Choose Section"}
              </button>
            </form>
          )}
        </div>

        <div className="card mt-3 p-3">
          <div className="card-header-wrapper p-1">
            <h5 className="blogs-heading">{formData.Id ? "Update Why Choose Item" : "Add Why Choose Item"}</h5>
          </div>
          <form onSubmit={handleSubmit} className="mt-3">
            <div className="mb-3">
              <label className="form-label">
                Title <span className="required-field">*</span>
              </label>
              <input
                type="text"
                name="Title"
                value={formData.Title}
                placeholder="Enter Title"
                onChange={handleInputChange}
                className={`form-control ${errors.Title ? "is-invalid" : ""}`}
              />
              {errors.Title && <div className="invalid-feedback">{errors.Title}</div>}
            </div>
            <div className="mb-3">
              <label className="form-label">
                Description <span className="required-field">*</span>
              </label>
              <textarea
                name="Description"
                value={formData.Description}
                placeholder="Enter Description"
                onChange={handleInputChange}
                className={`form-control ${errors.Description ? "is-invalid" : ""}`}
                rows="3"
              ></textarea>
              {errors.Description && <div className="invalid-feedback">{errors.Description}</div>}
            </div>
            <div className="mb-3 col-lg-3">
              <label className="form-label">Display Order</label>
              <input
                type="number"
                name="DisplayOrder"
                value={formData.DisplayOrder}
                onChange={handleInputChange}
                className="form-control"
              />
            </div>

            <button type="submit" className="btn btn-secondary" disabled={isButtonDisabled}>
              {isButtonDisabled ? (formData.Id ? "Updating" : "Saving") : formData.Id ? "Update" : "Save"}
            </button>
            {formData.Id && (
              <button type="button" onClick={resetForm} className="btn btn-danger ms-1">
                Cancel
              </button>
            )}
          </form>
        </div>

        <div className="card mt-3">
          <div className="card-header">
            <h5 className="mb-sm-2 mt-sm-2">Why Choose Items</h5>
          </div>
          <div className="card-body">
            {loading ? (
              <Loading />
            ) : (
              <div className="table-responsive">
                <table className="table align-middle table-bordered">
                  <TableHeader columns={["#", "Title", "Description", "Display Order", "Action"]} />
                  <tbody>
                    {whyItems.length === 0 ? (
                      <TableDataStatusError colspan="5" />
                    ) : (
                      whyItems.map((item, index) => (
                        <tr key={item.id}>
                          <td>{index + 1}</td>
                          <td>{item.title}</td>
                          <td>{item.description}</td>
                          <td>{item.displayOrder}</td>
                          <td>
                            <div className="d-flex gap-1">
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                onClick={() => handleEdit(item)}
                              >
                                <i className="ri-pencil-line"></i>
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDelete(item.id)}
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            <button
              type="button"
              className="btn btn-light mt-2"
              onClick={() => navigate("/venue-category-pages")}
            >
              Back to Venue Category Pages
            </button>
          </div>
        </div>
      </div>
    </>
  );
};