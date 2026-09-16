import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  deleteLandingPage,
  fetchAllLandingPages,
  publishUnpublishLandingPage,
} from "../../services/lpMasterServices";
import TableHeader from "../Common/TableComponent/TableHeader";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { confirmDelete } from "../Common/OtherElements/confirmDeleteClone";
import { Loading } from "../Common/OtherElements/Loading";
import { TableDataStatusError } from "../Common/OtherElements/TableDataStatusError";
import { handleErrors } from "../../utils/errorHandler";
import { Pagination } from "../Common/TableComponent/Pagination";
import { usePageLevelAccess } from "../../hooks/usePageLevelAccess";
import PublishToggle from "../Common/OtherElements/PublishToggle";
import { getStatusLabel, getStatusBadgeVariant, StatusType } from "../../utils/statusType";

// A landing page counts as published if the API's `isPublished` boolean
// says so. Falls back to the numeric StatusType enum (Active or Published)
// for any records that only carry a `status` field.
const isLandingPagePublished = (item) =>
  typeof item.isPublished === "boolean"
    ? item.isPublished
    : item.status === StatusType.Active || item.status === StatusType.Published;

// Base URL the public site serves landing pages under. Each row's live URL
// is this base + the page's `lpUrl` slug.
const LANDING_PAGE_BASE_URL = "https://meridianbythelawns.com/landing";

const getLandingPageUrl = (lpUrl) => `${LANDING_PAGE_BASE_URL}/${lpUrl}`;

export const ManageLandingPages = () => {
  const navigate = useNavigate();
  const [entriesPerPage, setEntriesPerPage] = useState(30);
  const [currentPage, setCurrentPage] = useState(1);
  const [allLandingPages, setAllLandingPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchedTerm, setSearchedTerm] = useState("");
  const [pageAccessDetails, setPageAccessDetails] = useState([]);
  const PageLevelAccessurl = "landing-pages";
  const { pageAccessData } = usePageLevelAccess(PageLevelAccessurl);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (pageAccessData) {
      if (!pageAccessData.viewAccess) {
        navigate("/404-error-page");
      } else {
        setPageAccessDetails(pageAccessData);
      }
    } else {
      console.log("No page access details found");
    }
  }, [pageAccessData, navigate]);

  useEffect(() => {
    const loadLandingPages = async () => {
      setLoading(true);
      try {
        const result = await fetchAllLandingPages();
        setAllLandingPages(result || []);
      } catch (error) {
        handleErrors(error);
      } finally {
        setLoading(false);
      }
    };
    loadLandingPages();
  }, []);

  const filteredLandingPages = useMemo(() => {
    if (!searchedTerm.trim()) return allLandingPages;
    const term = searchedTerm.trim().toLowerCase();
    return allLandingPages.filter((item) =>
      [item.lpTitle, item.lpUrl].filter(Boolean).some((field) => field.toLowerCase().includes(term))
    );
  }, [allLandingPages, searchedTerm]);

  const totalCount = filteredLandingPages.length;
  const totalPages = Math.ceil(totalCount / entriesPerPage) || 1;

  const paginatedLandingPages = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredLandingPages.slice(start, start + entriesPerPage);
  }, [filteredLandingPages, currentPage, entriesPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [entriesPerPage, searchedTerm]);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const handleEntriesPerPageChange = (e) => {
    setEntriesPerPage(parseInt(e.target.value, 10));
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleSearchClick = () => {
    setSearchedTerm(searchTerm);
  };

  const handleDelete = async (id) => {
    const confirmed = await confirmDelete("Landing Page");
    if (confirmed) {
      try {
        await deleteLandingPage(id);
        setAllLandingPages((prev) => prev.filter((item) => item.id !== id));
        Swal.fire("Deleted!", "The landing page has been deleted successfully.", "success");
      } catch (error) {
        handleErrors(error);
      }
    }
  };

  // PublishToggle already calls publishUnpublishLandingPage itself; this
  // syncs the local table state once the API call succeeds, updating both
  // the toggle state and the Status badge so they don't fall out of sync
  // until refetch.
  const handlePublishChange = (id, newIsPublished) => {
    setAllLandingPages((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              isPublished: newIsPublished,
              status: newIsPublished ? StatusType.Published : StatusType.Draft,
            }
          : item
      )
    );
  };

  return (
    <>
      <style>
        {`
          .table>:not(caption)>*>* {
            padding: .75rem 0.5rem !important;
          }
          .table-scroll-wrapper {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .table-scroll-wrapper::-webkit-scrollbar {
            height: 8px;
          }
          .table-scroll-wrapper::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 4px;
          }
          .table-scroll-wrapper::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
          }
          .action-icon-btn {
            width: 34px;
            height: 34px;
            padding: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            border: none;
            font-size: 16px;
          }
          .action-icon-gallery { background: #fff3cd; color: #b8860b; }
          .action-icon-gallery:hover { background: #ffe8a1; }
          .action-icon-faqs { background: #e6e6fa; color: #6a5acd; }
          .action-icon-faqs:hover { background: #d4d4f7; }
          .action-icon-testimonials { background: #d4f7dc; color: #1e8449; }
          .action-icon-testimonials:hover { background: #b8f0c6; }
          .action-icon-spaces { background: #dbeafe; color: #1d4ed8; }
          .action-icon-spaces:hover { background: #bfdbfe; }
          .action-icon-banners { background: #fde2e2; color: #c0392b; }
          .action-icon-banners:hover { background: #fbc4c4; }
          .action-icon-view { background: #e0f2fe; color: #0369a1; }
          .action-icon-view:hover { background: #bae6fd; }
        `}
      </style>
      {pageAccessDetails.viewAccess ? (
        <div className="row">
          <div className="col-xxl-12">
            <div className="card mt-xxl-n5">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-sm-2 mt-sm-2">Manage Landing Pages</h5>
                {pageAccessDetails.addAccess && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => navigate("add")}
                  >
                    Add Landing Page
                  </button>
                )}
              </div>
              <div className="card-body manage-amenity-master-card-body">
                <div className="responsive-filter-type mb-3">
                  <div className="entries-dropdown">
                    <label htmlFor="entriesPerPage" className="form-label me-2">
                      Show entries:
                    </label>
                    <select
                      className="form-select"
                      id="entriesPerPage"
                      value={entriesPerPage}
                      onChange={handleEntriesPerPageChange}
                    >
                      <option value="30">30</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                      <option value="200">200</option>
                    </select>
                  </div>
                  <div className="search-input">
                    <label htmlFor="search" className="form-label me-2">
                      Search:
                    </label>
                    <input
                      type="text"
                      id="search"
                      className="form-control"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search..."
                      ref={searchInputRef}
                    />
                  </div>
                  <div className="pt-2">
                    <button
                      className="btn btn-secondary btn-properties-search"
                      onClick={handleSearchClick}
                    >
                      Search
                    </button>
                  </div>
                </div>

                {loading ? (
                  <Loading />
                ) : (
                  <div className="table-responsive table-scroll-wrapper">
                    <table className="table align-middle table-bordered">
                      <TableHeader
                        columns={[
                          "#",
                          "LP Title",
                          "LP URL",
                          "View",
                          "Banquet Hall Title",
                          "Banners",
                          "Gallery",
                          "FAQs",
                          "Testimonials",
                          "Banquet Spaces",
                          "Status",
                          "Published?",
                          "Action",
                        ]}
                      />
                      <tbody className="manage-page-group-table-values p-3">
                        {paginatedLandingPages.length === 0 ? (
                          <TableDataStatusError colspan="13" />
                        ) : (
                          paginatedLandingPages.map((item, index) => (
                            <tr key={item.id}>
                              <td>{(currentPage - 1) * entriesPerPage + index + 1}</td>
                              <td>{item.lpTitle}</td>
                              <td>{item.lpUrl}</td>

                              <td className="text-center">
                                
                                 <a  href={getLandingPageUrl(item.lpUrl)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="action-icon-btn action-icon-view"
                                  title="View Live Page"
                                >
                                  <i className="ri-external-link-line"></i>
                                </a>
                              </td>

                              <td>{item.banquetHallTitle}</td>

                              <td className="text-center">
                                <button
                                  type="button"
                                  className="action-icon-btn action-icon-banners"
                                  title="Manage Banners"
                                  onClick={() => navigate(`/landing-pages/${item.lpGuid}/banners`)}
                                >
                                  <i className="ri-image-2-line"></i>
                                </button>
                              </td>
                              <td className="text-center">
                                <button
                                  type="button"
                                  className="action-icon-btn action-icon-gallery"
                                  title="Manage Gallery"
                                  onClick={() => navigate(`/landing-pages/${item.lpGuid}/gallery`)}
                                >
                                  <i className="ri-image-line"></i>
                                </button>
                              </td>

                              <td className="text-center">
                                <button
                                  type="button"
                                  className="action-icon-btn action-icon-faqs"
                                  title="Manage FAQs"
                                  onClick={() => navigate(`/landing-pages/${item.lpGuid}/faqs`)}
                                >
                                  <i className="ri-question-line"></i>
                                </button>
                              </td>

                              <td className="text-center">
                                <button
                                  type="button"
                                  className="action-icon-btn action-icon-testimonials"
                                  title="Manage Testimonials"
                                  onClick={() =>
                                    navigate(`/landing-pages/${item.lpGuid}/testimonials`)
                                  }
                                >
                                  <i className="ri-chat-quote-line"></i>
                                </button>
                              </td>

                              <td className="text-center">
                                <button
                                  type="button"
                                  className="action-icon-btn action-icon-spaces"
                                  title="Manage Banquet Spaces"
                                  onClick={() =>
                                    navigate(`/landing-pages/${item.lpGuid}/banquet-space-details`)
                                  }
                                >
                                  <i className="ri-layout-grid-line"></i>
                                </button>
                              </td>

                              <td>
                                <span
                                  style={{ fontSize: "12px" }}
                                  className={`badge badge-soft-${getStatusBadgeVariant(
                                    item.status
                                  )} badge-border`}
                                >
                                  {getStatusLabel(item.status)}
                                </span>
                              </td>

                              <td>
                                <PublishToggle
                                  id={item.id}
                                  initialStatus={isLandingPagePublished(item)}
                                  onStatusChange={(newIsPublished) =>
                                    handlePublishChange(item.id, newIsPublished)
                                  }
                                  publishFn={publishUnpublishLandingPage}
                                  entityLabel="Landing Page"
                                />
                              </td>

                              <td>
                                <div className="d-flex gap-1">
                                  {pageAccessDetails.editAccess && (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-primary"
                                      onClick={() => navigate(`update/${item.id}`)}
                                    >
                                      <i className="ri-pencil-line"></i>
                                    </button>
                                  )}
                                  {pageAccessDetails.deleteAccess && (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-danger"
                                      onClick={() => handleDelete(item.id)}
                                    >
                                      <i className="ri-delete-bin-line"></i>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  totalEntries={totalCount}
                  entriesPerPage={entriesPerPage}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        ""
      )}
    </>
  );
};