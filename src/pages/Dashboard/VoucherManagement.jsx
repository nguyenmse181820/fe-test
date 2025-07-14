import React, { useState, useEffect } from 'react';
import voucherService from '../../services/voucherService';
import styles from './VoucherManagement.module.css';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaEdit, FaTrash, FaSearch, FaFilter, FaSort, FaUsers } from 'react-icons/fa';

const VoucherManagement = () => {
    const [vouchers, setVouchers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        description: '',
        discountPercentage: '',
        minSpend: '',
        maxDiscount: '',
        startDate: '',
        endDate: '',
        usageLimit: '',
        pointsRequired: '',
        status: 'ACTIVE'
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [sortConfig, setSortConfig] = useState({ key: 'endDate', direction: 'asc' });
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [voucherToDeleteId, setVoucherToDeleteId] = useState(null);
    const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
    const [usersForVoucher, setUsersForVoucher] = useState([]);

    useEffect(() => {
        fetchVouchers();
    }, []);

    const fetchVouchers = async () => {
        try {
            setLoading(true);
            const response = await voucherService.getAllVouchers();
            setVouchers(response.voucherTemplates || []);
        } catch (error) {
            setError('Failed to fetch vouchers');
            toast.error('Failed to fetch vouchers');
            console.error('Error fetching vouchers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            if (selectedVoucher) {
                await voucherService.updateVoucher(selectedVoucher.id, formData);
                toast.success('Voucher updated successfully');
            } else {
                await voucherService.createVoucher(formData);
                toast.success('Voucher created successfully');
            }
            await fetchVouchers();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving voucher:', error);
            
            let errorMessage = 'Failed to save voucher';
            
            // Handle specific API error formats
            if (error.response?.status === 400) {
                const responseData = error.response.data;
                
                // Handle format: {"statusCode":400,"error":{"pointsRequired":"Points required is required"}}
                if (responseData?.error && typeof responseData.error === 'object') {
                    const fieldErrors = Object.entries(responseData.error)
                        .map(([field, message]) => `${field}: ${message}`)
                        .join(', ');
                    errorMessage = `Validation errors: ${fieldErrors}`;
                } 
                // Handle format: {"message": "Validation failed"}
                else if (responseData?.message) {
                    errorMessage = responseData.message;
                }
                // Handle format: {"statusCode":400,"message":"Invalid data"}
                else if (responseData?.statusCode === 400 && responseData?.message) {
                    errorMessage = responseData.message;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (voucher) => {
        setSelectedVoucher(voucher);
        setFormData({
            code: voucher.code,
            name: voucher.name,
            description: voucher.description,
            discountPercentage: voucher.discountPercentage,
            minSpend: voucher.minSpend,
            maxDiscount: voucher.maxDiscount,
            startDate: voucher.startDate,
            endDate: voucher.endDate,
            usageLimit: voucher.usageLimit,
            pointsRequired: voucher.pointsRequired,
            status: voucher.status
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (id) => {
        setVoucherToDeleteId(id);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (voucherToDeleteId) {
            try {
                setLoading(true);
                await voucherService.deleteVoucher(voucherToDeleteId);
                toast.success('Voucher deleted successfully');
                await fetchVouchers();
            } catch (error) {
                const errorMessage = 'Failed to delete voucher';
                setError(errorMessage);
                toast.error(errorMessage);
                console.error('Error deleting voucher:', error);
            } finally {
                setLoading(false);
                handleCloseConfirmModal();
            }
        }
    };

    const handleCloseModal = () => {
        setSelectedVoucher(null);
        setFormData({
            code: '',
            name: '',
            description: '',
            discountPercentage: '',
            minSpend: '',
            maxDiscount: '',
            startDate: '',
            endDate: '',
            usageLimit: '',
            pointsRequired: '',
            status: 'ACTIVE'
        });
        setIsModalOpen(false);
        setError(null);
    };

    const handleCloseConfirmModal = () => {
        setIsConfirmModalOpen(false);
        setVoucherToDeleteId(null);
    };

    const handleViewUsers = (userVouchers) => {
        setUsersForVoucher(userVouchers);
        setIsUsersModalOpen(true);
    };

    const handleCloseUsersModal = () => {
        setIsUsersModalOpen(false);
        setUsersForVoucher([]);
    };

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const filteredAndSortedVouchers = vouchers
        .filter(voucher => {
            const matchesSearch =
                voucher.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                voucher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                voucher.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || voucher.status === statusFilter;
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            if (sortConfig.key === 'endDate') {
                return sortConfig.direction === 'asc'
                    ? new Date(a.endDate) - new Date(b.endDate)
                    : new Date(b.endDate) - new Date(a.endDate);
            }
            return sortConfig.direction === 'asc'
                ? a[sortConfig.key] > b[sortConfig.key] ? 1 : -1
                : a[sortConfig.key] < b[sortConfig.key] ? 1 : -1;
        });

    if (loading) {
        return <div className={styles.loading}>Loading...</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button
                    className={styles.addButton}
                    onClick={() => setIsModalOpen(true)}
                >
                    Add New Voucher
                </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.filters}>
                <div className={styles.searchBox}>
                    <FaSearch className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search vouchers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>
                <div className={styles.filterBox}>
                    <FaFilter className={styles.filterIcon} />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="ALL">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                    </select>
                </div>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('code')}>
                                Code <FaSort className={styles.sortIcon} />
                            </th>
                            <th onClick={() => handleSort('name')}>
                                Name <FaSort className={styles.sortIcon} />
                            </th>
                            <th>Description</th>
                            <th onClick={() => handleSort('discountPercentage')}>
                                Discount <FaSort className={styles.sortIcon} />
                            </th>
                            <th onClick={() => handleSort('pointsRequired')}>
                                Points Required <FaSort className={styles.sortIcon} />
                            </th>
                            <th onClick={() => handleSort('endDate')}>
                                Valid Until <FaSort className={styles.sortIcon} />
                            </th>
                            <th onClick={() => handleSort('status')}>
                                Status <FaSort className={styles.sortIcon} />
                            </th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndSortedVouchers.map(voucher => (
                            <tr key={voucher.id}>
                                <td className={styles.codeCell}>
                                    <code>{voucher.code}</code>
                                </td>
                                <td>{voucher.name}</td>
                                <td className={styles.descriptionCell}>
                                    {voucher.description}
                                </td>
                                <td>{voucher.discountPercentage}%</td>
                                <td>{voucher.pointsRequired || 0} pts</td>
                                <td>{new Date(voucher.endDate).toLocaleDateString()}</td>
                                <td>
                                    <span className={`${styles.status} ${styles[voucher.status.toLowerCase()]}`}>
                                        {voucher.status}
                                    </span>
                                </td>
                                <td className={styles.actionsCell}>
                                    <button
                                        className={styles.iconButton}
                                        onClick={() => handleViewUsers(voucher.userVouchers)}
                                        title="View Users"
                                    >
                                        <FaUsers />
                                    </button>
                                    <button
                                        className={styles.iconButton}
                                        onClick={() => handleEdit(voucher)}
                                        title="Edit"
                                    >
                                        <FaEdit />
                                    </button>
                                    <button
                                        className={`${styles.iconButton} ${styles.deleteButton}`}
                                        onClick={() => handleDeleteClick(voucher.id)}
                                        title="Delete"
                                    >
                                        <FaTrash />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2>{selectedVoucher ? 'Edit Voucher' : 'Create New Voucher'}</h2>
                            <button
                                className={styles.closeButton}
                                onClick={handleCloseModal}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className={styles.modalForm}>
                            <div className={styles.formSection}>
                                <h3>Basic Information</h3>
                                <div className={styles.formGrid}>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="code">Voucher Code</label>
                                        <input
                                            type="text"
                                            id="code"
                                            name="code"
                                            value={formData.code}
                                            onChange={handleChange}
                                            required
                                            placeholder="Enter voucher code (e.g., SUMMER2024)"
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="name">Name</label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                            placeholder="Enter voucher name"
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="status">Status</label>
                                        <select
                                            id="status"
                                            name="status"
                                            value={formData.status}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="ACTIVE">Active</option>
                                            <option value="INACTIVE">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.formSection}>
                                <h3>Discount Details</h3>
                                <div className={styles.formGrid}>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="discountPercentage">Discount Percentage</label>
                                        <input
                                            type="number"
                                            id="discountPercentage"
                                            name="discountPercentage"
                                            value={formData.discountPercentage}
                                            onChange={handleChange}
                                            required
                                            min="0"
                                            max="100"
                                            placeholder="Enter discount percentage"
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="minSpend">Minimum Spend</label>
                                        <input
                                            type="number"
                                            id="minSpend"
                                            name="minSpend"
                                            value={formData.minSpend}
                                            onChange={handleChange}
                                            required
                                            min="0"
                                            placeholder="Enter minimum spend amount"
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="maxDiscount">Maximum Discount</label>
                                        <input
                                            type="number"
                                            id="maxDiscount"
                                            name="maxDiscount"
                                            value={formData.maxDiscount}
                                            onChange={handleChange}
                                            required
                                            min="0"
                                            placeholder="Enter maximum discount amount"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.formSection}>
                                <h3>Validity Period</h3>
                                <div className={styles.formGrid}>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="startDate">Start Date</label>
                                        <input
                                            type="date"
                                            id="startDate"
                                            name="startDate"
                                            value={formData.startDate}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="endDate">End Date</label>
                                        <input
                                            type="date"
                                            id="endDate"
                                            name="endDate"
                                            value={formData.endDate}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="usageLimit">Usage Limit</label>
                                        <input
                                            type="number"
                                            id="usageLimit"
                                            name="usageLimit"
                                            value={formData.usageLimit}
                                            onChange={handleChange}
                                            required
                                            min="1"
                                            placeholder="Enter usage limit"
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="pointsRequired">Points Required</label>
                                        <input
                                            type="number"
                                            id="pointsRequired"
                                            name="pointsRequired"
                                            value={formData.pointsRequired}
                                            onChange={handleChange}
                                            required
                                            min="1"
                                            placeholder="Enter points required for redemption"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.formSection}>
                                <h3>Description</h3>
                                <div className={styles.formGroup}>
                                    <textarea
                                        id="description"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        required
                                        placeholder="Enter voucher description"
                                        rows="4"
                                    />
                                </div>
                            </div>

                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    className={styles.cancelButton}
                                    onClick={handleCloseModal}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.submitButton}
                                    disabled={loading}
                                >
                                    {loading ? 'Saving...' : selectedVoucher ? 'Update Voucher' : 'Create Voucher'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isConfirmModalOpen && (
                <div className={styles.modal}>
                    <div className={styles.confirmModalContent}>
                        <div className={styles.modalHeader}>
                            <h2>Confirm Deletion</h2>
                            <button
                                className={styles.closeButton}
                                onClick={handleCloseConfirmModal}
                            >
                                ×
                            </button>
                        </div>
                        <div className={styles.confirmModalBody}>
                            <p>Are you sure you want to delete this voucher? This action cannot be undone.</p>
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                type="button"
                                className={styles.cancelButton}
                                onClick={handleCloseConfirmModal}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={`${styles.submitButton} ${styles.deleteConfirmButton}`}
                                onClick={handleConfirmDelete}
                                disabled={loading}
                            >
                                {loading ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isUsersModalOpen && (
                <div className={styles.modal}>
                    <div className={styles.usersModalContent}>
                        <div className={styles.modalHeader}>
                            <h2>Users with this Voucher</h2>
                            <button
                                className={styles.closeButton}
                                onClick={handleCloseUsersModal}
                            >
                                ×
                            </button>
                        </div>
                        <div className={styles.usersModalBody}>
                            {usersForVoucher.length > 0 ? (
                                <table className={styles.usersTable}>
                                    <thead>
                                        <tr>
                                            <th>Membership ID</th>
                                            <th>Voucher Code</th>
                                            <th>Used</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usersForVoucher.map(userVoucher => (
                                            <tr key={userVoucher.id}>
                                                <td>{userVoucher.membershipId}</td>
                                                <td><code>{userVoucher.code}</code></td>
                                                <td>{userVoucher.isUsed ? 'Yes' : 'No'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p>No users have received this voucher yet.</p>
                            )}
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                type="button"
                                className={styles.cancelButton}
                                onClick={handleCloseUsersModal}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoucherManagement; 