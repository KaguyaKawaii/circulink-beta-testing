import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminNavigation from "../AdminNavigation";
import { 
  Eye, 
  Trash2, 
  RefreshCw, 
  RotateCcw,
  Newspaper,
  Calendar,
  FileText,
  CheckSquare,
  Square
} from "lucide-react";
import {
  Button,
  IconButton,
  StatsCard,
  Card,
  FilterBar,
  BulkActionBar,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  TableSkeleton,
  Pagination,
  ConfirmModal,
  ViewModal,
  AlertModal,
  EmptyState,
  ExportMenu,
  LoadingOverlay
} from "./ArchiveComponents"; // Import from same folder

function ArchivedNews({ setView, admin }) {
  const [archivedNewsList, setArchivedNewsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [viewNews, setViewNews] = useState(null);
  const [restoreConfirm, setRestoreConfirm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [alertModal, setAlertModal] = useState({ show: false, title: "", message: "", type: "info" });
  
  // Selection State
  const [selectedNews, setSelectedNews] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkRestoreConfirm, setShowBulkRestoreConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  const itemsPerPage = 10;

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    archivedThisWeek: 0,
    withImages: 0
  });

  // Show alert modal
  const showAlert = (title, message, type = "info") => {
    setAlertModal({ show: true, title, message, type });
  };

  useEffect(() => {
    fetchArchivedNews();
  }, []);

  const fetchArchivedNews = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/news/archived`);
      const data = Array.isArray(res.data) ? res.data : [];
      setArchivedNewsList(data);
      
      // Calculate stats
      const now = new Date();
      const weekAgo = new Date(now.setDate(now.getDate() - 7));
      
      setStats({
        total: data.length,
        archivedThisWeek: data.filter(item => new Date(item.updatedAt) > weekAgo).length,
        withImages: data.filter(item => item.image).length
      });
      
      setSelectedNews([]);
      setSelectAll(false);
    } catch (err) {
      console.error(err);
      showAlert("Error", "Failed to load archived news.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Selection Handlers
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedNews([]);
    } else {
      setSelectedNews(filteredNews.map(news => news._id));
    }
    setSelectAll(!selectAll);
  };

  const handleClearAll = () => {
    setSelectedNews([]);
    setSelectAll(false);
  };

  const handleSelectNews = (newsId) => {
    setSelectedNews(prev => {
      if (prev.includes(newsId)) {
        const newSelected = prev.filter(id => id !== newsId);
        setSelectAll(false);
        return newSelected;
      } else {
        const newSelected = [...prev, newsId];
        if (newSelected.length === filteredNews.length) {
          setSelectAll(true);
        }
        return newSelected;
      }
    });
  };

  // Bulk Actions
  const handleBulkRestoreClick = () => {
    if (selectedNews.length === 0) {
      showAlert("No News Selected", "Please select at least one news item to restore.", "warning");
      return;
    }
    setShowBulkRestoreConfirm(true);
  };

  const handleBulkRestoreConfirm = async () => {
    if (selectedNews.length === 0) return;
    
    setIsBulkActionLoading(true);
    
    try {
      await Promise.all(
        selectedNews.map(id => 
          axios.put(`${import.meta.env.VITE_API_URL}/api/news/restore/${id}`)
        )
      );
      
      showAlert("Success", `Successfully restored ${selectedNews.length} news item${selectedNews.length !== 1 ? 's' : ''}.`, "success");
      fetchArchivedNews();
      handleClearAll();
    } catch (err) {
      console.error("Bulk restore error:", err);
      showAlert("Error", err.response?.data?.message || "Failed to restore news.", "error");
    } finally {
      setIsBulkActionLoading(false);
      setShowBulkRestoreConfirm(false);
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedNews.length === 0) {
      showAlert("No News Selected", "Please select at least one news item to delete.", "warning");
      return;
    }
    setShowBulkDeleteConfirm(true);
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedNews.length === 0) return;
    
    setIsBulkActionLoading(true);
    
    try {
      await Promise.all(
        selectedNews.map(id => 
          axios.delete(`${import.meta.env.VITE_API_URL}/api/news/${id}`)
        )
      );
      
      showAlert("Success", `Successfully deleted ${selectedNews.length} archived news item${selectedNews.length !== 1 ? 's' : ''}.`, "success");
      fetchArchivedNews();
      handleClearAll();
    } catch (err) {
      console.error("Bulk delete error:", err);
      showAlert("Error", err.response?.data?.message || "Failed to delete news.", "error");
    } finally {
      setIsBulkActionLoading(false);
      setShowBulkDeleteConfirm(false);
    }
  };

  const handleRestoreNews = async () => {
    if (!restoreConfirm) return;

    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/news/restore/${restoreConfirm._id}`);
      showAlert("Success", "News restored successfully.", "success");
      fetchArchivedNews();
      setRestoreConfirm(null);
    } catch (err) {
      console.error("Error restoring news:", err);
      showAlert("Error", "Failed to restore news.", "error");
    }
  };

  const handleDeleteNews = async () => {
    if (!deleteConfirm) return;

    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/news/${deleteConfirm._id}`);
      showAlert("Success", "News permanently deleted.", "success");
      fetchArchivedNews();
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Error deleting news:", err);
      showAlert("Error", "Failed to delete news.", "error");
    }
  };

  const handleExport = (format) => {
    const data = filteredNews.map(item => ({
      Title: item.title,
      Content: item.content.replace(/<[^>]*>/g, ''), // Strip HTML
      'Has Image': item.image ? 'Yes' : 'No',
      'Archived On': new Date(item.updatedAt).toLocaleString()
    }));

    if (format === 'csv') {
      const csv = [
        Object.keys(data[0]).join(','),
        ...data.map(row => Object.values(row).map(val => `"${val}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `archived-news-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }
  };

  // Filter & sort
  const filteredNews = archivedNewsList
    .filter(n =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.updatedAt) - new Date(a.updatedAt);
      if (sortBy === "oldest") return new Date(a.updatedAt) - new Date(b.updatedAt);
      if (sortBy === "title-az") return a.title.localeCompare(b.title);
      if (sortBy === "title-za") return b.title.localeCompare(a.title);
      return 0;
    });

  const totalPages = Math.ceil(filteredNews.length / itemsPerPage);
  const paginatedNews = filteredNews.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Sort options
  const sortOptions = [
    { value: "newest", label: "Newest Archived" },
    { value: "oldest", label: "Oldest Archived" },
    { value: "title-az", label: "Title A-Z" },
    { value: "title-za", label: "Title Z-A" }
  ];

  return (
    <>
      <AdminNavigation setView={setView} currentView="archivedNews" onLogout={() => window.dispatchEvent(new Event('showLogoutModal'))} />
      <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
        <header className="bg-white px-6 py-4 border-b border-gray-200 sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-[#CC0000]">Archived News Management</h1>
          <p className="text-gray-600">View and manage archived news announcements</p>
        </header>

        <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <StatsCard 
              icon={Newspaper} 
              label="Total Archived" 
              value={stats.total} 
              color="blue"
            />
            <StatsCard 
              icon={Calendar} 
              label="Archived This Week" 
              value={stats.archivedThisWeek} 
              color="green"
            />
            <StatsCard 
              icon={FileText} 
              label="With Images" 
              value={stats.withImages} 
              color="purple"
            />
          </div>

{/* Filter Bar */}
<FilterBar
  search={search}
  onSearchChange={setSearch}
  searchPlaceholder="Search by title or content..."
  sortOptions={sortOptions}
  sortBy={sortBy}
  onSortChange={setSortBy}
>
  <div className="flex justify-center gap-2">
    <ExportMenu onExport={handleExport} />
    <Button
      variant="outline"
      size="sm"
      icon={RefreshCw}
      onClick={fetchArchivedNews}
    >
      Refresh
    </Button>
  </div>
</FilterBar>

          {/* Bulk Action Bar */}
          <BulkActionBar
            selectedCount={selectedNews.length}
            onSelectAll={handleSelectAll}
            onClearAll={handleClearAll}
            isAllSelected={selectAll}
            actions={[
              {
                label: "Restore",
                icon: RotateCcw,
                variant: "success",
                onClick: handleBulkRestoreClick,
                loading: isBulkActionLoading
              },
              {
                label: "Delete",
                icon: Trash2,
                variant: "danger",
                onClick: handleBulkDeleteClick,
                loading: isBulkActionLoading
              }
            ]}
          />

          {/* News List */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Archived News List</h2>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {filteredNews.length} {filteredNews.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {isLoading ? (
              <Table>
                <TableHead>
                  <tr>
                    <TableHeaderCell>Select</TableHeaderCell>
                    <TableHeaderCell>#</TableHeaderCell>
                    <TableHeaderCell>Title</TableHeaderCell>
                    <TableHeaderCell>Image</TableHeaderCell>
                    <TableHeaderCell>Content</TableHeaderCell>
                    <TableHeaderCell>Archived</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </tr>
                </TableHead>
                <TableBody>
                  <TableSkeleton rows={5} columns={7} />
                </TableBody>
              </Table>
            ) : paginatedNews.length === 0 ? (
              <EmptyState
                type="news"
                icon={Newspaper}
                title="No archived news found"
                message="News items you archive will appear here for future reference."
                action={
                  <Button variant="primary" onClick={fetchArchivedNews}>
                    Refresh
                  </Button>
                }
              />
            ) : (
              <>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell className="w-10">
                        <button
                          onClick={handleSelectAll}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          {selectAll ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                      </TableHeaderCell>
                      <TableHeaderCell>#</TableHeaderCell>
                      <TableHeaderCell>Title</TableHeaderCell>
                      <TableHeaderCell>Image</TableHeaderCell>
                      <TableHeaderCell>Content</TableHeaderCell>
                      <TableHeaderCell>Archived</TableHeaderCell>
                      <TableHeaderCell>Actions</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {paginatedNews.map((item, index) => (
                      <TableRow key={item._id}>
                        <TableCell>
                          <button
                            onClick={() => handleSelectNews(item._id)}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            {selectedNews.includes(item._id) ? (
                              <CheckSquare size={18} className="text-[#CC0000]" />
                            ) : (
                              <Square size={18} />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="text-gray-700">
                          {(page - 1) * itemsPerPage + index + 1}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900">
                          {item.title}
                        </TableCell>
                        <TableCell>
                          {item.image && (
                            <img
                              src={item.image}
                              alt="cover"
                              className="h-12 w-12 object-cover rounded-lg"
                            />
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div
                            className="truncate text-gray-600"
                            dangerouslySetInnerHTML={{ __html: item.content }}
                          />
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          {new Date(item.updatedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <IconButton
                              icon={Eye}
                              onClick={() => setViewNews(item)}
                              tooltip="View"
                              color="blue"
                            />
                            <IconButton
                              icon={RotateCcw}
                              onClick={() => setRestoreConfirm(item)}
                              tooltip="Restore"
                              color="green"
                            />
                            <IconButton
                              icon={Trash2}
                              onClick={() => setDeleteConfirm(item)}
                              tooltip="Delete Permanently"
                              color="red"
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  totalItems={filteredNews.length}
                  itemsPerPage={itemsPerPage}
                />
              </>
            )}
          </Card>

          {/* Modals */}
          <ConfirmModal
            isOpen={!!restoreConfirm}
            onClose={() => setRestoreConfirm(null)}
            onConfirm={handleRestoreNews}
            title="Confirm Restore"
            message={`Are you sure you want to restore the news "${restoreConfirm?.title}"?`}
            type="restore"
          />

          <ConfirmModal
            isOpen={!!deleteConfirm}
            onClose={() => setDeleteConfirm(null)}
            onConfirm={handleDeleteNews}
            title="Confirm Delete"
            message={`Are you sure you want to permanently delete the news "${deleteConfirm?.title}"? This action cannot be undone.`}
            type="danger"
          />

          <ConfirmModal
            isOpen={showBulkRestoreConfirm}
            onClose={() => setShowBulkRestoreConfirm(false)}
            onConfirm={handleBulkRestoreConfirm}
            title="Restore Multiple News Items"
            message={`Are you sure you want to restore ${selectedNews.length} selected news item${selectedNews.length !== 1 ? 's' : ''}?`}
            type="restore"
            loading={isBulkActionLoading}
          />

          <ConfirmModal
            isOpen={showBulkDeleteConfirm}
            onClose={() => setShowBulkDeleteConfirm(false)}
            onConfirm={handleBulkDeleteConfirm}
            title="Delete Multiple News Items"
            message={`Are you sure you want to permanently delete ${selectedNews.length} selected news item${selectedNews.length !== 1 ? 's' : ''}? This action cannot be undone.`}
            type="danger"
            loading={isBulkActionLoading}
          />

          {/* View Modal */}
          <ViewModal
            isOpen={!!viewNews}
            onClose={() => setViewNews(null)}
            title="News Details"
          >
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{viewNews?.title}</h3>
              <p className="text-sm text-gray-500">
                Archived on: {viewNews && new Date(viewNews.updatedAt).toLocaleString()}
              </p>
            </div>
            
            {viewNews?.image && (
              <img
                src={viewNews.image}
                alt="News cover"
                className="w-full h-64 object-cover rounded-xl mb-6"
              />
            )}
            
            {viewNews && (
              <div
                className="prose max-w-none mb-6"
                dangerouslySetInnerHTML={{ __html: viewNews.content }}
              />
            )}
          </ViewModal>
        </div>
      </main>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.show}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({ show: false, title: "", message: "", type: "info" })}
      />

      {/* Loading Overlay */}
      {isBulkActionLoading && <LoadingOverlay message="Processing your request..." />}
    </>
  );
}

export default ArchivedNews;