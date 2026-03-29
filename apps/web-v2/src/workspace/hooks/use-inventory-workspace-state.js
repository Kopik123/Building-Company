import React from 'react';
import { v2Api } from '../../lib/api';
import {
  normalizeText,
  createServiceFormState,
  createMaterialFormState,
  serviceToFormState,
  materialToFormState,
  useAsyncState
} from '../kit.jsx';

function useInventoryWorkspaceState() {
  const services = useAsyncState(() => v2Api.getInventoryServices(), [], []);
  const materials = useAsyncState(() => v2Api.getInventoryMaterials(), [], []);
  const [serviceSearch, setServiceSearch] = React.useState('');
  const [materialSearch, setMaterialSearch] = React.useState('');
  const [selectedServiceId, setSelectedServiceId] = React.useState('');
  const [selectedMaterialId, setSelectedMaterialId] = React.useState('');
  const [isCreatingService, setIsCreatingService] = React.useState(false);
  const [isCreatingMaterial, setIsCreatingMaterial] = React.useState(false);
  const [serviceForm, setServiceForm] = React.useState(() => createServiceFormState());
  const [materialForm, setMaterialForm] = React.useState(() => createMaterialFormState());
  const [serviceSaving, setServiceSaving] = React.useState(false);
  const [materialSaving, setMaterialSaving] = React.useState(false);
  const [serviceStatus, setServiceStatus] = React.useState('');
  const [serviceError, setServiceError] = React.useState('');
  const [materialStatus, setMaterialStatus] = React.useState('');
  const [materialError, setMaterialError] = React.useState('');

  const filteredServices = services.data.filter((service) =>
    [service?.title, service?.slug, service?.category, service?.shortDescription].join(' ').toLowerCase().includes(normalizeText(serviceSearch))
  );
  const filteredMaterials = materials.data.filter((material) =>
    [material?.name, material?.sku, material?.category, material?.supplier].join(' ').toLowerCase().includes(normalizeText(materialSearch))
  );

  React.useEffect(() => {
    if (isCreatingService) return;
    if (!filteredServices.length) {
      if (selectedServiceId) setSelectedServiceId('');
      return;
    }
    if (!filteredServices.some((service) => service.id === selectedServiceId)) {
      setSelectedServiceId(filteredServices[0].id);
    }
  }, [filteredServices, selectedServiceId, isCreatingService]);

  React.useEffect(() => {
    if (isCreatingMaterial) return;
    if (!filteredMaterials.length) {
      if (selectedMaterialId) setSelectedMaterialId('');
      return;
    }
    if (!filteredMaterials.some((material) => material.id === selectedMaterialId)) {
      setSelectedMaterialId(filteredMaterials[0].id);
    }
  }, [filteredMaterials, selectedMaterialId, isCreatingMaterial]);

  React.useEffect(() => {
    if (isCreatingService) return;
    const selectedService = services.data.find((service) => service.id === selectedServiceId);
    if (!selectedService) return;
    setServiceForm(serviceToFormState(selectedService));
  }, [selectedServiceId, services.data, isCreatingService]);

  React.useEffect(() => {
    if (isCreatingMaterial) return;
    const selectedMaterial = materials.data.find((material) => material.id === selectedMaterialId);
    if (!selectedMaterial) return;
    setMaterialForm(materialToFormState(selectedMaterial));
  }, [selectedMaterialId, materials.data, isCreatingMaterial]);

  const onServiceFieldChange = (key) => (event) => {
    const nextValue = event?.target?.type === 'checkbox' ? event.target.checked : event.target.value;
    setServiceForm((prev) => ({ ...prev, [key]: nextValue }));
  };

  const onMaterialFieldChange = (key) => (event) => {
    const nextValue = event?.target?.type === 'checkbox' ? event.target.checked : event.target.value;
    setMaterialForm((prev) => ({ ...prev, [key]: nextValue }));
  };

  const startNewService = () => {
    setIsCreatingService(true);
    setSelectedServiceId('');
    setServiceForm(createServiceFormState());
    setServiceStatus('');
    setServiceError('');
  };

  const startNewMaterial = () => {
    setIsCreatingMaterial(true);
    setSelectedMaterialId('');
    setMaterialForm(createMaterialFormState());
    setMaterialStatus('');
    setMaterialError('');
  };

  const selectService = (service) => {
    setIsCreatingService(false);
    setSelectedServiceId(service.id);
    setServiceForm(serviceToFormState(service));
    setServiceStatus('');
    setServiceError('');
  };

  const selectMaterial = (material) => {
    setIsCreatingMaterial(false);
    setSelectedMaterialId(material.id);
    setMaterialForm(materialToFormState(material));
    setMaterialStatus('');
    setMaterialError('');
  };

  return {
    services,
    materials,
    serviceSearch,
    setServiceSearch,
    materialSearch,
    setMaterialSearch,
    selectedServiceId,
    setSelectedServiceId,
    selectedMaterialId,
    setSelectedMaterialId,
    isCreatingService,
    setIsCreatingService,
    isCreatingMaterial,
    setIsCreatingMaterial,
    serviceForm,
    setServiceForm,
    materialForm,
    setMaterialForm,
    serviceSaving,
    setServiceSaving,
    materialSaving,
    setMaterialSaving,
    serviceStatus,
    setServiceStatus,
    serviceError,
    setServiceError,
    materialStatus,
    setMaterialStatus,
    materialError,
    setMaterialError,
    filteredServices,
    filteredMaterials,
    onServiceFieldChange,
    onMaterialFieldChange,
    startNewService,
    startNewMaterial,
    selectService,
    selectMaterial
  };
}

export { useInventoryWorkspaceState };
