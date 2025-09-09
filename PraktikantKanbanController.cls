/**
 * @description Apex controller for Praktikant Kanban Lightning Web Component
 * Handles CRUD operations for Stundenerfassung_Praktikant__c records
 * @author Your Name
 * @date 2024
 */
public with sharing class PraktikantKanbanController {
    
    /**
     * @description Fetches all Praktikant records created today
     * @return List of Stundenerfassung_Praktikant__c records with required fields
     */
    @AuraEnabled(cacheable=true)
    public static List<Stundenerfassung_Praktikant__c> getPraktikants() {
        try {
            return [
                SELECT Id, 
                       Name_Anzeige__c, 
                       Taetigkeit__c, 
                       Name_Link__c, 
                       AnwesendheitStatus__c, 
                       Grund_der_Abwesenheit__c,
                       CreatedDate,
                       LastModifiedDate
                FROM Stundenerfassung_Praktikant__c 
                WHERE DAY_ONLY(CreatedDate) = TODAY
                ORDER BY Name_Anzeige__c ASC
            ];
        } catch (Exception e) {
            System.debug('Error in getPraktikants: ' + e.getMessage());
            throw new AuraHandledException('Error fetching Praktikants: ' + e.getMessage());
        }
    }
    
    /**
     * @description Updates the attendance status of a Praktikant record
     * @param praktikantId The ID of the Praktikant record to update
     * @param newStatus The new attendance status (Unentschuldigt, Anwesend, Entschuldigt)
     * @param reason The reason for absence (only required for Entschuldigt status)
     * @return Updated Stundenerfassung_Praktikant__c record
     */
    @AuraEnabled
    public static Stundenerfassung_Praktikant__c updatePraktikantStatus(
        String praktikantId, 
        String newStatus, 
        String reason
    ) {
        try {
            // Validate input parameters
            if (String.isBlank(praktikantId)) {
                throw new AuraHandledException('Praktikant ID is required');
            }
            
            if (String.isBlank(newStatus)) {
                throw new AuraHandledException('New status is required');
            }
            
            // Validate status value
            Set<String> validStatuses = new Set<String>{'Unentschuldigt', 'Anwesend', 'Entschuldigt'};
            if (!validStatuses.contains(newStatus)) {
                throw new AuraHandledException('Invalid status value. Must be one of: ' + 
                                              String.join(new List<String>(validStatuses), ', '));
            }
            
            // Fetch the record to update
            List<Stundenerfassung_Praktikant__c> praktikants = [
                SELECT Id, 
                       Name_Anzeige__c,
                       AnwesendheitStatus__c, 
                       Grund_der_Abwesenheit__c
                FROM Stundenerfassung_Praktikant__c 
                WHERE Id = :praktikantId 
                LIMIT 1
            ];
            
            if (praktikants.isEmpty()) {
                throw new AuraHandledException('Praktikant record not found with ID: ' + praktikantId);
            }
            
            Stundenerfassung_Praktikant__c praktikant = praktikants[0];
            
            // Update the status
            praktikant.AnwesendheitStatus__c = newStatus;
            
            // Handle reason field based on status
            if (newStatus == 'Entschuldigt') {
                // For Entschuldigt status, reason is required
                if (String.isBlank(reason)) {
                    throw new AuraHandledException('Grund der Abwesenheit ist erforderlich für Entschuldigt Status');
                }
                praktikant.Grund_der_Abwesenheit__c = reason;
            } else {
                // For other statuses, clear the reason field
                praktikant.Grund_der_Abwesenheit__c = null;
            }
            
            // Update the record
            update praktikant;
            
            // Log the change for audit purposes
            System.debug('Praktikant status updated: ' + 
                        'ID=' + praktikantId + 
                        ', Name=' + praktikant.Name_Anzeige__c + 
                        ', Status=' + newStatus + 
                        ', Reason=' + reason);
            
            // Return the updated record
            return [
                SELECT Id, 
                       Name_Anzeige__c, 
                       Taetigkeit__c, 
                       Name_Link__c, 
                       AnwesendheitStatus__c, 
                       Grund_der_Abwesenheit__c,
                       LastModifiedDate
                FROM Stundenerfassung_Praktikant__c 
                WHERE Id = :praktikantId 
                LIMIT 1
            ];
            
        } catch (Exception e) {
            System.debug('Error in updatePraktikantStatus: ' + e.getMessage());
            System.debug('Stack trace: ' + e.getStackTraceString());
            throw new AuraHandledException('Error updating Praktikant status: ' + e.getMessage());
        }
    }
    
    /**
     * @description Bulk update multiple Praktikant records (for future enhancement)
     * @param updates List of PraktikantUpdate wrapper objects
     * @return List of updated records
     */
    @AuraEnabled
    public static List<Stundenerfassung_Praktikant__c> bulkUpdatePraktikants(List<PraktikantUpdate> updates) {
        try {
            if (updates == null || updates.isEmpty()) {
                throw new AuraHandledException('No updates provided');
            }
            
            Set<String> praktikantIds = new Set<String>();
            for (PraktikantUpdate update : updates) {
                if (!String.isBlank(update.praktikantId)) {
                    praktikantIds.add(update.praktikantId);
                }
            }
            
            if (praktikantIds.isEmpty()) {
                throw new AuraHandledException('No valid Praktikant IDs provided');
            }
            
            // Fetch records to update
            Map<String, Stundenerfassung_Praktikant__c> praktikantMap = new Map<String, Stundenerfassung_Praktikant__c>(
                [SELECT Id, AnwesendheitStatus__c, Grund_der_Abwesenheit__c
                 FROM Stundenerfassung_Praktikant__c 
                 WHERE Id IN :praktikantIds]
            );
            
            List<Stundenerfassung_Praktikant__c> recordsToUpdate = new List<Stundenerfassung_Praktikant__c>();
            
            for (PraktikantUpdate update : updates) {
                if (praktikantMap.containsKey(update.praktikantId)) {
                    Stundenerfassung_Praktikant__c praktikant = praktikantMap.get(update.praktikantId);
                    praktikant.AnwesendheitStatus__c = update.newStatus;
                    
                    if (update.newStatus == 'Entschuldigt' && !String.isBlank(update.reason)) {
                        praktikant.Grund_der_Abwesenheit__c = update.reason;
                    } else if (update.newStatus != 'Entschuldigt') {
                        praktikant.Grund_der_Abwesenheit__c = null;
                    }
                    
                    recordsToUpdate.add(praktikant);
                }
            }
            
            if (!recordsToUpdate.isEmpty()) {
                update recordsToUpdate;
            }
            
            return recordsToUpdate;
            
        } catch (Exception e) {
            System.debug('Error in bulkUpdatePraktikants: ' + e.getMessage());
            throw new AuraHandledException('Error in bulk update: ' + e.getMessage());
        }
    }
    
    /**
     * @description Get statistics for today's Praktikant records
     * @return PraktikantStats wrapper with counts by status
     */
    @AuraEnabled(cacheable=true)
    public static PraktikantStats getPraktikantStats() {
        try {
            List<AggregateResult> results = [
                SELECT AnwesendheitStatus__c, COUNT(Id) recordCount
                FROM Stundenerfassung_Praktikant__c 
                WHERE DAY_ONLY(CreatedDate) = TODAY
                GROUP BY AnwesendheitStatus__c
            ];
            
            PraktikantStats stats = new PraktikantStats();
            
            for (AggregateResult result : results) {
                String status = (String) result.get('AnwesendheitStatus__c');
                Integer count = (Integer) result.get('recordCount');
                
                if (status == 'Anwesend') {
                    stats.anwesendCount = count;
                } else if (status == 'Unentschuldigt') {
                    stats.unentschuldigtCount = count;
                } else if (status == 'Entschuldigt') {
                    stats.entschuldigtCount = count;
                }
            }
            
            stats.totalCount = stats.anwesendCount + stats.unentschuldigtCount + stats.entschuldigtCount;
            
            return stats;
            
        } catch (Exception e) {
            System.debug('Error in getPraktikantStats: ' + e.getMessage());
            throw new AuraHandledException('Error getting statistics: ' + e.getMessage());
        }
    }
    
    // Wrapper classes
    public class PraktikantUpdate {
        @AuraEnabled
        public String praktikantId;
        
        @AuraEnabled
        public String newStatus;
        
        @AuraEnabled
        public String reason;
    }
    
    public class PraktikantStats {
        @AuraEnabled
        public Integer anwesendCount = 0;
        
        @AuraEnabled
        public Integer unentschuldigtCount = 0;
        
        @AuraEnabled
        public Integer entschuldigtCount = 0;
        
        @AuraEnabled
        public Integer totalCount = 0;
    }
}