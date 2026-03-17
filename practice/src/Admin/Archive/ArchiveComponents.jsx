import React, { useState } from "react";
import { 
  RotateCcw, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Hourglass,
  Check,
  Download,
  ChevronDown,
  Eye,
  Square,
  CheckSquare,
  X,
  Filter,
  Building2,
  User,
  Mail,
  Hash,
  GraduationCap,
  Calendar,
  Newspaper,
  FileText
} from "lucide-react";

// ============================================
// CONSTANTS
// ============================================

export const COLORS = {
  primary: '#CC0000',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  
  // Status colors
  completed: '#10b981',
  approved: '#3b82f6',
  cancelled: '#6b7280',
  rejected: '#ef4444',
  expired: '#f59e0b',
  pending: '#fbbf24'
};

// ============================================
// BUTTON COMPONENTS
// ============================================

export const Button = ({ 
  children, 
  variant = "primary", 
  size = "md",
  icon: Icon,
  loading = false,
  disabled = false,
  onClick,
  className = "",
  ...props 
}) => {
  const variants = {
    primary: "bg-[#CC0000] text-white hover:bg-red-700",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    success: "bg-green-600 text-white hover:bg-green-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
    warning: "bg-yellow-600 text-white hover:bg-yellow-700",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50"
  };

  const sizes = {
    sm: "px-2 py-1 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${variants[variant]} 
        ${sizes[size]} 
        rounded-lg font-medium transition-all duration-200
        flex items-center justify-center gap-2
        disabled:opacity-50 disabled:cursor-not-allowed
        cursor-pointer outline-0
        ${className}
      `}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      )}
      {Icon && !loading && <Icon size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  );
};

export const IconButton = ({ 
  icon: Icon, 
  onClick, 
  tooltip,
  color = "blue",
  className = "",
  ...props 
}) => {
  const colors = {
    blue: "text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100",
    green: "text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100",
    red: "text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100",
    gray: "text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100",
    purple: "text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100",
    orange: "text-orange-600 hover:text-orange-800 bg-orange-50 hover:bg-orange-100"
  };

  return (
    <button
      onClick={onClick}
      className={`
        p-2 rounded-md transition-all cursor-pointer outline-0
        ${colors[color]}
        ${className}
      `}
      title={tooltip}
      {...props}
    >
      <Icon size={16} />
    </button>
  );
};

// ============================================
// CARD COMPONENTS
// ============================================

export const StatsCard = ({ icon: Icon, label, value, color = "blue" }) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600"
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
};

export const Card = ({ children, className = "", padding = true }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${padding ? 'p-6' : ''} ${className}`}>
    {children}
  </div>
);

// ============================================
// FILTER COMPONENTS
// ============================================

export const FilterBar = ({ 
  search, 
  onSearchChange, 
  searchPlaceholder = "Search...",
  filters = [],
  sortOptions = [],
  sortBy,
  onSortChange,
  children 
}) => {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <Card padding={false} className="mb-4">
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative md:col-span-2">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC0000] focus:outline-none"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {search && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Dynamic Filters */}
          {filters.map((filter, index) => (
            <div key={index} className="relative">
              <select
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC0000] focus:outline-none appearance-none cursor-pointer"
              >
                {filter.options.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {filter.icon && (
                <filter.icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              )}
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          ))}

          {/* Sort */}
          {sortOptions.length > 0 && (
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="w-full pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC0000] focus:outline-none appearance-none cursor-pointer"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          )}
        </div>

        {/* Advanced Filters Toggle */}
        {children && (
          <>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 mt-4 text-sm text-gray-600 hover:text-gray-900"
            >
              <ChevronDown className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`} size={16} />
              Advanced Filters
            </button>
            
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                {children}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
};

// ============================================
// BULK ACTION BAR
// ============================================

export const BulkActionBar = ({ 
  selectedCount, 
  onSelectAll, 
  onClearAll,
  isAllSelected,
  actions = [],
  className = ""
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className={`sticky top-0 z-10 bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 ${className}`}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={isAllSelected ? onClearAll : onSelectAll}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            {isAllSelected ? <Square size={16} /> : <CheckSquare size={16} />}
            <span>{isAllSelected ? "Deselect All" : "Select All"}</span>
          </button>
          <span className="text-sm font-medium text-gray-700">
            {selectedCount} selected
          </span>
        </div>

        <div className="flex gap-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant}
              size="sm"
              icon={action.icon}
              onClick={action.onClick}
              loading={action.loading}
            >
              {action.label}
            </Button>
          ))}
        </div>

        <div className="flex-1" />
        
        {onClearAll && (
          <button
            onClick={onClearAll}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear selection
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================
// STATUS BADGE
// ============================================

export const StatusBadge = ({ status, className = "" }) => {
  const config = {
    // Report statuses
    Completed: { icon: CheckCircle, color: 'green', bg: 'bg-green-100', text: 'text-green-800' },
    Approved: { icon: Check, color: 'blue', bg: 'bg-blue-100', text: 'text-blue-800' },
    Cancelled: { icon: XCircle, color: 'gray', bg: 'bg-gray-100', text: 'text-gray-800' },
    Rejected: { icon: AlertCircle, color: 'red', bg: 'bg-red-100', text: 'text-red-800' },
    Expired: { icon: Clock, color: 'orange', bg: 'bg-orange-100', text: 'text-orange-800' },
    Pending: { icon: Hourglass, color: 'yellow', bg: 'bg-yellow-100', text: 'text-yellow-800' },
    
    // Report categories
    Maintenance: { icon: Clock, color: 'blue', bg: 'bg-blue-100', text: 'text-blue-800' },
    Cleaning: { icon: CheckCircle, color: 'green', bg: 'bg-green-100', text: 'text-green-800' },
    Safety: { icon: AlertTriangle, color: 'orange', bg: 'bg-orange-100', text: 'text-orange-800' },
    Equipment: { icon: AlertCircle, color: 'purple', bg: 'bg-purple-100', text: 'text-purple-800' },
    
    // User roles
    admin: { icon: User, color: 'purple', bg: 'bg-purple-100', text: 'text-purple-800' },
    faculty: { icon: User, color: 'blue', bg: 'bg-blue-100', text: 'text-blue-800' },
    student: { icon: User, color: 'green', bg: 'bg-green-100', text: 'text-green-800' },
    staff: { icon: User, color: 'orange', bg: 'bg-orange-100', text: 'text-orange-800' }
  };

  const statusConfig = config[status] || { 
    icon: AlertCircle, 
    color: 'gray', 
    bg: 'bg-gray-100', 
    text: 'text-gray-800' 
  };
  
  const Icon = statusConfig.icon;

  return (
    <span className={`
      inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
      ${statusConfig.bg} ${statusConfig.text}
      ${className}
    `}>
      <Icon size={12} />
      {status}
    </span>
  );
};

// ============================================
// TABLE COMPONENTS
// ============================================

export const Table = ({ children, className = "" }) => (
  <div className="overflow-x-auto rounded-lg border border-gray-200 relative">
    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none md:hidden" />
    <table className={`w-full text-sm ${className}`}>
      {children}
    </table>
  </div>
);

export const TableHead = ({ children }) => (
  <thead className="bg-gray-50">
    {children}
  </thead>
);

export const TableBody = ({ children }) => (
  <tbody className="bg-white divide-y divide-gray-200">
    {children}
  </tbody>
);

export const TableRow = ({ children, className = "" }) => (
  <tr className={`hover:bg-gray-50 transition-all hover:translate-x-1 ${className}`}>
    {children}
  </tr>
);

export const TableHeaderCell = ({ children, className = "" }) => (
  <th className={`p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}>
    {children}
  </th>
);

export const TableCell = ({ children, className = "" }) => (
  <td className={`p-3 ${className}`}>
    {children}
  </td>
);

// ============================================
// SKELETON LOADERS
// ============================================

export const SkeletonRow = ({ columns = 5 }) => (
  <TableRow>
    {Array.from({ length: columns }).map((_, i) => (
      <TableCell key={i}>
        <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ 
          width: i === 0 ? '40px' : 
                 i === 1 ? '60px' : 
                 i === columns - 1 ? '100px' : '120px' 
        }} />
      </TableCell>
    ))}
  </TableRow>
);

export const TableSkeleton = ({ rows = 5, columns = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <SkeletonRow key={i} columns={columns} />
    ))}
  </>
);

// ============================================
// PAGINATION
// ============================================

export const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange,
  totalItems,
  itemsPerPage,
  className = "" 
}) => {
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5];
    }
    
    if (currentPage >= totalPages - 2) {
      return [
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages
      ];
    }
    
    return [
      currentPage - 2,
      currentPage - 1,
      currentPage,
      currentPage + 1,
      currentPage + 2
    ];
  };

  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalPages <= 1) return null;

  return (
    <div className={`flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-gray-200 ${className}`}>
      <div className="text-sm text-gray-500 order-2 sm:order-1">
        Showing {start} to {end} of {totalItems} entries
      </div>
      
      <div className="flex gap-2 order-1 sm:order-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        
        <div className="flex gap-1">
          {getPageNumbers().map(pageNum => (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`
                w-10 h-10 rounded-lg flex items-center justify-center transition-colors
                ${currentPage === pageNum
                  ? "bg-[#CC0000] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }
              `}
            >
              {pageNum}
            </button>
          ))}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

// ============================================
// MODAL COMPONENTS
// ============================================

export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  icon: Icon, 
  iconBg = "bg-blue-100",
  iconColor = "text-blue-600",
  children,
  maxWidth = "max-w-md"
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className={`bg-white rounded-xl w-full ${maxWidth} animate-in fade-in zoom-in duration-200`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            {Icon && (
              <div className={`p-2 ${iconBg} rounded-full`}>
                <Icon className={iconColor} size={24} />
              </div>
            )}
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

export const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  type = "danger",
  loading = false
}) => {
  const config = {
    danger: {
      icon: AlertTriangle,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      confirmVariant: "danger",
      confirmText: "Delete"
    },
    warning: {
      icon: AlertTriangle,
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600",
      confirmVariant: "warning",
      confirmText: "Proceed"
    },
    success: {
      icon: CheckCircle,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      confirmVariant: "success",
      confirmText: "Confirm"
    },
    restore: {
      icon: RotateCcw,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      confirmVariant: "success",
      confirmText: "Restore"
    }
  };

  const modalConfig = config[type] || config.danger;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={modalConfig.icon}
      iconBg={modalConfig.iconBg}
      iconColor={modalConfig.iconColor}
    >
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          variant={modalConfig.confirmVariant} 
          onClick={onConfirm}
          loading={loading}
        >
          {modalConfig.confirmText}
        </Button>
      </div>
    </Modal>
  );
};

// ============================================
// VIEW MODAL
// ============================================

export const ViewModal = ({ isOpen, onClose, title, children }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    maxWidth="max-w-4xl"
  >
    <div className="max-h-[70vh] overflow-y-auto pr-2">
      {children}
    </div>
    <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
      <Button variant="primary" onClick={onClose}>
        Close
      </Button>
    </div>
  </Modal>
);

// ============================================
// ALERT MODAL
// ============================================

export const AlertModal = ({ 
  isOpen, 
  title, 
  message, 
  type = "info", 
  onClose 
}) => {
  const config = {
    success: {
      icon: CheckCircle,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      borderColor: "border-green-200"
    },
    error: {
      icon: AlertCircle,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      borderColor: "border-red-200"
    },
    warning: {
      icon: AlertTriangle,
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600",
      borderColor: "border-yellow-200"
    },
    info: {
      icon: AlertCircle,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      borderColor: "border-blue-200"
    }
  };

  const alertConfig = config[type] || config.info;
  const Icon = alertConfig.icon;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-xl w-full max-w-md border ${alertConfig.borderColor} animate-in fade-in zoom-in duration-200`}>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className={`p-2 ${alertConfig.iconBg} rounded-lg shadow-sm`}>
              <Icon className={alertConfig.iconColor} size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
              <p className="text-gray-600 mt-1">
                {message}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 font-medium text-sm cursor-pointer outline-0"
            autoFocus
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// EMPTY STATE
// ============================================

export const EmptyState = ({ 
  type = "items",
  icon: Icon = AlertCircle,
  title,
  message,
  action
}) => (
  <div className="text-center p-12 border border-dashed border-gray-300 rounded-lg">
    <Icon className="mx-auto h-12 w-12 text-gray-400" />
    <h3 className="mt-4 text-lg font-medium text-gray-900">
      {title || `No archived ${type} found`}
    </h3>
    <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
      {message || `Items you archive will appear here for future reference.`}
    </p>
    {action && (
      <div className="mt-6">
        {action}
      </div>
    )}
  </div>
);

// ============================================
// EXPORT MENU
// ============================================

export const ExportMenu = ({ onExport }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        icon={Download}
        onClick={() => setIsOpen(!isOpen)}
      >
        Export
      </Button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50">
            <button
              onClick={() => {
                onExport('csv');
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
            >
              Export as CSV
            </button>
            <button
              onClick={() => {
                onExport('pdf');
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
            >
              Export as PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================
// LOADING OVERLAY
// ============================================

export const LoadingOverlay = ({ message = "Processing your request..." }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
      <div className="flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#CC0000] border-t-transparent rounded-full animate-spin mb-4"></div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Please wait
        </h3>
        <p className="text-gray-600 text-center">
          {message}
        </p>
      </div>
    </div>
  </div>
);