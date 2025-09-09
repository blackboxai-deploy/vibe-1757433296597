"use client";

import React, { useState } from 'react';

interface PraktikantRecord {
  Id: string;
  Name_Anzeige__c: string;
  Taetigkeit__c: string;
  Name_Link__c?: string;
  AnwesendheitStatus__c: 'Unentschuldigt' | 'Anwesend' | 'Entschuldigt';
  Grund_der_Abwesenheit__c?: string;
}

const mockData: PraktikantRecord[] = [
  {
    Id: '1',
    Name_Anzeige__c: 'Max Mustermann',
    Taetigkeit__c: 'Software Development',
    Name_Link__c: 'https://example.com/max',
    AnwesendheitStatus__c: 'Unentschuldigt',
  },
  {
    Id: '2', 
    Name_Anzeige__c: 'Anna Schmidt',
    Taetigkeit__c: 'UI/UX Design',
    Name_Link__c: 'https://example.com/anna',
    AnwesendheitStatus__c: 'Anwesend',
  },
  {
    Id: '3',
    Name_Anzeige__c: 'Peter Weber',
    Taetigkeit__c: 'Quality Assurance',
    AnwesendheitStatus__c: 'Entschuldigt',
    Grund_der_Abwesenheit__c: 'Krankmeldung',
  },
  {
    Id: '4',
    Name_Anzeige__c: 'Lisa Müller',
    Taetigkeit__c: 'Project Management',
    Name_Link__c: 'https://example.com/lisa',
    AnwesendheitStatus__c: 'Anwesend',
  },
  {
    Id: '5',
    Name_Anzeige__c: 'Tom Fischer',
    Taetigkeit__c: 'DevOps Engineer',
    AnwesendheitStatus__c: 'Unentschuldigt',
  }
];

export default function PraktikantKanbanPreview() {
  const [praktikants, setPraktikants] = useState<PraktikantRecord[]>(mockData);
  const [draggedItem, setDraggedItem] = useState<PraktikantRecord | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [reasonText, setReasonText] = useState('');
  const [pendingUpdate, setPendingUpdate] = useState<{id: string, status: string} | null>(null);

  // Filter items by status
  const unentschuldigtItems = praktikants.filter(p => p.AnwesendheitStatus__c === 'Unentschuldigt');
  const anwesendItems = praktikants.filter(p => p.AnwesendheitStatus__c === 'Anwesend');
  const entschuldigtItems = praktikants.filter(p => p.AnwesendheitStatus__c === 'Entschuldigt');

  const handleDragStart = (e: React.DragEvent, item: PraktikantRecord) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    
    if (!draggedItem) return;

    if (newStatus === 'Entschuldigt' && draggedItem.AnwesendheitStatus__c !== 'Entschuldigt') {
      // Show modal for reason input
      setPendingUpdate({id: draggedItem.Id, status: newStatus});
      setShowModal(true);
      setReasonText('');
    } else {
      // Direct update
      updateStatus(draggedItem.Id, newStatus as any, '');
    }
    
    setDraggedItem(null);
  };

  const updateStatus = (id: string, newStatus: 'Unentschuldigt' | 'Anwesend' | 'Entschuldigt', reason: string) => {
    setPraktikants(prev => prev.map(p => 
      p.Id === id 
        ? {
            ...p, 
            AnwesendheitStatus__c: newStatus,
            Grund_der_Abwesenheit__c: newStatus === 'Entschuldigt' ? reason : undefined
          }
        : p
    ));
  };

  const handleSaveReason = () => {
    if (pendingUpdate && reasonText.trim()) {
      updateStatus(pendingUpdate.id, pendingUpdate.status as any, reasonText.trim());
      setShowModal(false);
      setPendingUpdate(null);
      setReasonText('');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setPendingUpdate(null);
    setReasonText('');
  };

  const PraktikantCard = ({ item }: { item: PraktikantRecord }) => (
    <div 
      className="bg-white rounded-lg border border-gray-200 p-4 mb-3 cursor-move hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
      draggable
      onDragStart={(e) => handleDragStart(e, item)}
    >
      <div className="flex items-center mb-2">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold mr-3">
          {item.Name_Anzeige__c.charAt(0)}
        </div>
        <h4 className="font-semibold text-gray-800">{item.Name_Anzeige__c}</h4>
      </div>
      <div className="text-sm text-gray-600 mb-2 flex items-center">
        <span className="mr-2">💼</span>
        {item.Taetigkeit__c}
      </div>
      {item.Name_Link__c && (
        <div className="text-sm text-blue-600 mb-2 flex items-center">
          <span className="mr-2">🔗</span>
          <a href={item.Name_Link__c} target="_blank" rel="noopener noreferrer" className="hover:underline">
            Profile Link
          </a>
        </div>
      )}
      {item.Grund_der_Abwesenheit__c && (
        <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded border-l-2 border-orange-400 flex items-start">
          <span className="mr-2 mt-0.5">💭</span>
          <span className="italic">{item.Grund_der_Abwesenheit__c}</span>
        </div>
      )}
      <div className="absolute top-2 right-2 opacity-30 hover:opacity-70 transition-opacity">
        <span className="text-gray-400">⋮⋮</span>
      </div>
    </div>
  );

  const Column = ({ 
    title, 
    status, 
    items, 
    bgColor, 
    icon 
  }: { 
    title: string; 
    status: string; 
    items: PraktikantRecord[]; 
    bgColor: string;
    icon: string;
  }) => (
    <div 
      className="bg-gray-100 rounded-lg p-4 min-h-[400px]"
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, status)}
    >
      <div className={`${bgColor} text-white rounded-lg p-4 mb-4 flex items-center`}>
        <span className="mr-3 text-xl">{icon}</span>
        <h3 className="text-lg font-semibold">{title} ({items.length})</h3>
      </div>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.Id}>
            <PraktikantCard item={item} />
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-center text-gray-400 py-8 border-2 border-dashed border-gray-300 rounded-lg">
            Drop items here
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Praktikant Kanban Board</h1>
              <p className="text-gray-600 mt-1">Attendance Status Management - {new Date().toLocaleDateString('de-DE')}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-semibold">Total:</span> {praktikants.length} Praktikants
              </div>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Column 
            title="Unentschuldigt"
            status="Unentschuldigt"
            items={unentschuldigtItems}
            bgColor="bg-gradient-to-r from-red-500 to-red-600"
            icon="⚠️"
          />
          <Column 
            title="Anwesend"
            status="Anwesend" 
            items={anwesendItems}
            bgColor="bg-gradient-to-r from-green-500 to-green-600"
            icon="✅"
          />
          <Column 
            title="Entschuldigt"
            status="Entschuldigt"
            items={entschuldigtItems}
            bgColor="bg-gradient-to-r from-orange-500 to-orange-600"
            icon="ℹ️"
          />
        </div>
      </div>

      {/* Modal for Absence Reason */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Grund der Abwesenheit</h3>
              <button 
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            
            <p className="text-gray-600 mb-4">
              Bitte geben Sie den Grund für die Abwesenheit ein:
            </p>
            
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 h-24 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Bitte Grund eingeben..."
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
            />
            
            <div className="flex justify-end space-x-3 mt-4">
              <button 
                onClick={closeModal}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button 
                onClick={handleSaveReason}
                disabled={!reasonText.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="max-w-7xl mx-auto mt-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">🖱️ How to Use (Preview Mode)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-800">
            <div>
              <h4 className="font-semibold mb-2">Desktop:</h4>
              <ul className="space-y-1 text-sm">
                <li>• Click and drag cards between columns</li>
                <li>• Drop in target column to change status</li>
                <li>• Modal popup for "Entschuldigt" reason</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Tablet/Mobile:</h4>
              <ul className="space-y-1 text-sm">
                <li>• Touch and drag cards (optimized for touch)</li>
                <li>• Visual feedback during drag operation</li>
                <li>• Responsive layout adapts to screen size</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* File Information */}
      <div className="max-w-7xl mx-auto mt-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📁 Lightning Web Component Files</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Component Files:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <span className="w-4 h-4 bg-blue-500 rounded mr-3"></span>
                  <code>praktikantKanban.html</code> - Template
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 bg-yellow-500 rounded mr-3"></span>
                  <code>praktikantKanban.js</code> - Logic & Events
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 bg-purple-500 rounded mr-3"></span>
                  <code>praktikantKanban.css</code> - Styling
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 bg-green-500 rounded mr-3"></span>
                  <code>praktikantKanban.js-meta.xml</code> - Metadata
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Apex Backend:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <span className="w-4 h-4 bg-red-500 rounded mr-3"></span>
                  <code>PraktikantKanbanController.cls</code> - SOQL & DML
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 bg-orange-500 rounded mr-3"></span>
                  <code>PraktikantKanbanControllerTest.cls</code> - Tests
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}