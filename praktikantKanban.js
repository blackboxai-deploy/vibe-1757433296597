import { LightningElement, wire, track, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import getPraktikants from '@salesforce/apex/PraktikantKanbanController.getPraktikants';
import updatePraktikantStatus from '@salesforce/apex/PraktikantKanbanController.updatePraktikantStatus';

export default class PraktikantKanban extends LightningElement {
    @api height = 600;
    
    @track praktikants = [];
    @track error;
    @track isLoading = true;
    @track showReasonModal = false;
    @track reasonText = '';
    @track selectedPraktikantId = '';
    @track selectedPraktikantName = '';
    @track targetStatus = '';
    
    // Drag and drop properties
    @track isDragging = false;
    @track draggedItem = {};
    @track dragPreviewStyle = '';
    draggedId = '';
    
    // Touch handling properties
    touchStartX = 0;
    touchStartY = 0;
    touchMoveX = 0;
    touchMoveY = 0;
    isDraggingTouch = false;
    draggedElement = null;
    
    wiredPraktikantsResult;

    @wire(getPraktikants)
    wiredPraktikants(result) {
        this.wiredPraktikantsResult = result;
        if (result.data) {
            this.praktikants = result.data;
            this.error = undefined;
            this.isLoading = false;
        } else if (result.error) {
            this.error = 'Error loading Praktikants: ' + result.error.body?.message || result.error.message;
            this.praktikants = [];
            this.isLoading = false;
        }
    }

    get containerStyle() {
        return `height: ${this.height}px;`;
    }

    get todayDate() {
        return new Date().toLocaleDateString('de-DE');
    }

    // Getters for filtered lists
    get unentschuldigtItems() {
        return this.praktikants.filter(item => item.AnwesendheitStatus__c === 'Unentschuldigt');
    }

    get anwesendItems() {
        return this.praktikants.filter(item => item.AnwesendheitStatus__c === 'Anwesend');
    }

    get entschuldigtItems() {
        return this.praktikants.filter(item => item.AnwesendheitStatus__c === 'Entschuldigt');
    }

    // Count getters
    get unentschuldigtCount() {
        return this.unentschuldigtItems.length;
    }

    get anwesendCount() {
        return this.anwesendItems.length;
    }

    get entschuldigtCount() {
        return this.entschuldigtItems.length;
    }

    get isReasonEmpty() {
        return !this.reasonText || this.reasonText.trim().length === 0;
    }

    // Drag and Drop Event Handlers
    handleDragStart(event) {
        this.draggedId = event.target.dataset.id;
        this.draggedItem = this.praktikants.find(p => p.Id === this.draggedId);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', this.draggedId);
        
        // Add visual feedback
        event.target.style.opacity = '0.5';
        this.isDragging = true;
    }

    handleDragEnd(event) {
        // Reset visual feedback
        event.target.style.opacity = '1';
        this.isDragging = false;
        this.clearDragHighlight();
    }

    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        
        // Add drop zone highlighting
        const column = event.currentTarget;
        column.classList.add('drag-over');
    }

    handleDrop(event) {
        event.preventDefault();
        
        const column = event.currentTarget;
        const newStatus = column.dataset.status;
        const draggedId = event.dataTransfer.getData('text/plain');
        
        this.clearDragHighlight();
        
        if (draggedId && newStatus) {
            this.handleStatusChange(draggedId, newStatus);
        }
    }

    // Touch Event Handlers for Mobile/Tablet
    handleTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.draggedElement = event.currentTarget;
        this.draggedId = event.currentTarget.dataset.id;
        this.draggedItem = this.praktikants.find(p => p.Id === this.draggedId);
        
        // Add visual feedback
        this.draggedElement.style.transform = 'scale(1.05)';
        this.draggedElement.style.zIndex = '1000';
        this.isDragging = true;
        this.isDraggingTouch = true;
    }

    handleTouchMove(event) {
        if (!this.isDraggingTouch) return;
        
        event.preventDefault();
        const touch = event.touches[0];
        this.touchMoveX = touch.clientX;
        this.touchMoveY = touch.clientY;
        
        const deltaX = this.touchMoveX - this.touchStartX;
        const deltaY = this.touchMoveY - this.touchStartY;
        
        // Update drag preview position
        this.dragPreviewStyle = `
            position: fixed;
            left: ${this.touchMoveX - 100}px;
            top: ${this.touchMoveY - 50}px;
            z-index: 10000;
            pointer-events: none;
            opacity: 0.8;
        `;
        
        // Highlight drop zones
        const elementBelow = document.elementFromPoint(this.touchMoveX, this.touchMoveY);
        this.clearDragHighlight();
        
        if (elementBelow) {
            const column = elementBelow.closest('.kanban-column');
            if (column) {
                column.classList.add('drag-over');
            }
        }
    }

    handleTouchEnd(event) {
        if (!this.isDraggingTouch) return;
        
        event.preventDefault();
        this.isDraggingTouch = false;
        this.isDragging = false;
        
        // Reset dragged element
        if (this.draggedElement) {
            this.draggedElement.style.transform = '';
            this.draggedElement.style.zIndex = '';
        }
        
        // Find drop target
        const elementBelow = document.elementFromPoint(this.touchMoveX, this.touchMoveY);
        const column = elementBelow?.closest('.kanban-column');
        
        this.clearDragHighlight();
        
        if (column && this.draggedId) {
            const newStatus = column.dataset.status;
            if (newStatus) {
                this.handleStatusChange(this.draggedId, newStatus);
            }
        }
        
        // Reset touch properties
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchMoveX = 0;
        this.touchMoveY = 0;
        this.draggedElement = null;
        this.dragPreviewStyle = '';
    }

    // Status Change Handler
    handleStatusChange(praktikantId, newStatus) {
        const praktikant = this.praktikants.find(p => p.Id === praktikantId);
        
        if (!praktikant || praktikant.AnwesendheitStatus__c === newStatus) {
            return; // No change needed
        }

        // If moving to "Entschuldigt", show reason modal
        if (newStatus === 'Entschuldigt') {
            this.selectedPraktikantId = praktikantId;
            this.selectedPraktikantName = praktikant.Name_Anzeige__c;
            this.targetStatus = newStatus;
            this.reasonText = praktikant.Grund_der_Abwesenheit__c || '';
            this.showReasonModal = true;
        } else {
            // Direct update for other statuses
            this.updateStatus(praktikantId, newStatus, '');
        }
    }

    // Modal handlers
    handleReasonChange(event) {
        this.reasonText = event.target.value;
    }

    closeModal() {
        this.showReasonModal = false;
        this.reasonText = '';
        this.selectedPraktikantId = '';
        this.selectedPraktikantName = '';
        this.targetStatus = '';
    }

    saveReason() {
        if (this.reasonText.trim()) {
            this.updateStatus(this.selectedPraktikantId, this.targetStatus, this.reasonText.trim());
            this.closeModal();
        }
    }

    // Update Status Method
    async updateStatus(praktikantId, newStatus, reason) {
        this.isLoading = true;
        
        try {
            await updatePraktikantStatus({
                praktikantId: praktikantId,
                newStatus: newStatus,
                reason: reason
            });
            
            // Refresh the data
            await refreshApex(this.wiredPraktikantsResult);
            
            this.showToast('Erfolg', 'Status erfolgreich aktualisiert', 'success');
            
        } catch (error) {
            console.error('Error updating status:', error);
            this.showToast('Fehler', 'Fehler beim Aktualisieren des Status: ' + (error.body?.message || error.message), 'error');
        } finally {
            this.isLoading = false;
        }
    }

    // Utility Methods
    clearDragHighlight() {
        const columns = this.template.querySelectorAll('.kanban-column');
        columns.forEach(column => {
            column.classList.remove('drag-over');
        });
    }

    handleRefresh() {
        this.isLoading = true;
        refreshApex(this.wiredPraktikantsResult);
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(event);
    }

    // Lifecycle Methods
    connectedCallback() {
        // Add global event listeners for better drag and drop support
        this.template.addEventListener('dragenter', this.handleDragEnter.bind(this));
        this.template.addEventListener('dragleave', this.handleDragLeave.bind(this));
    }

    handleDragEnter(event) {
        event.preventDefault();
    }

    handleDragLeave(event) {
        // Only remove highlighting if we're leaving the entire column
        if (!event.currentTarget.contains(event.relatedTarget)) {
            event.currentTarget.classList.remove('drag-over');
        }
    }

    disconnectedCallback() {
        // Cleanup any remaining event listeners or intervals
        this.clearDragHighlight();
    }
}