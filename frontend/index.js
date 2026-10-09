const defaultPets = [
    {
        id: '1',
        name: 'Mel',
        species: 'Cachorro',
        breed: 'Golden Retriever Mix',
        age: '1 ano e meio',
        size: 'Grande',
        city: 'São Paulo - SP',
        photo: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=600&q=80',
        description: 'Super dócil, castrada, vacinada e adora crianças. Resgatada de um abrigo recentemente.',
        tutorName: 'Ana Souza',
        tutorEmail: 'ana@email.com',
        tutorId: 'user_logged_ana',
        status: 'Disponível'
    },
    {
        id: '2',
        name: 'Simba',
        species: 'Gato',
        breed: 'Persa / SRD',
        age: '8 meses',
        size: 'Pequeno',
        city: 'Campinas - SP',
        photo: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=600&q=80',
        description: 'Gatinho muito carinhoso, adora dormir no colo e já usa a caixa de areia perfeitamente.',
        tutorName: 'Carlos Lima',
        tutorEmail: 'carlos@email.com',
        tutorId: 'user_logged_carlos',
        status: 'Disponível'
    },
    {
        id: '3',
        name: 'Thor',
        species: 'Cachorro',
        breed: 'Pitbull',
        age: '3 anos',
        size: 'Grande',
        city: 'Rio de Janeiro - RJ',
        photo: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=600&q=80',
        description: 'Cachorro forte, brincalhão e muito protetor. Procura um dono com espaço e tempo para passeios.',
        tutorName: 'Mariana Costa',
        tutorEmail: 'mariana@email.com',
        tutorId: 'user_logged_mariana',
        status: 'Disponível'
    },
    {
        id: '4',
        name: 'Luna',
        species: 'Gato',
        breed: 'Siamês Mix',
        age: '1 ano',
        size: 'Pequeno',
        city: 'Curitiba - PR',
        photo: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=600&q=80',
        description: 'Olhos azuis marcantes, muito curiosa e independente. Vacinada e vermifugada.',
        tutorName: 'Ana Souza',
        tutorEmail: 'ana@email.com',
        tutorId: 'user_logged_ana',
        status: 'Adotado'
    }
];

let currentUser = JSON.parse(localStorage.getItem('amigo_fiel_user')) || null;
let pets = JSON.parse(localStorage.getItem('amigo_fiel_pets')) || defaultPets;
let authModeIsRegister = false;

function saveState() {
    localStorage.setItem('amigo_fiel_pets', JSON.stringify(pets));
    localStorage.setItem('amigo_fiel_user', JSON.stringify(currentUser));
}

function navigateTo(viewId) {
    document.getElementById('view-home').classList.add('hidden');
    document.getElementById('view-dashboard').classList.add('hidden');

    if (viewId === 'home') {
        document.getElementById('view-home').classList.remove('hidden');
        renderPets();
    } else if (viewId === 'dashboard') {
        if (!currentUser) {
            openAuthModal();
            return;
        }
        document.getElementById('view-dashboard').classList.remove('hidden');
        renderMyPets();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateAuthNav() {
    const navArea = document.getElementById('authNavArea');
    if (!navArea) return;

    if (currentUser) {
        navArea.innerHTML = `
            <button onclick="navigateTo('dashboard')" class="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition">
                <i class="fa-solid fa-list-check"></i><span>Meus Anúncios</span>
            </button>
            <div class="flex items-center space-x-2 pl-2 border-l border-slate-200">
                <span class="text-xs font-semibold text-slate-700 hidden sm:inline">${currentUser.name}</span>
                <button onclick="logout()" class="text-slate-400 hover:text-red-500 p-2 rounded-lg transition" title="Sair">
                    <i class="fa-solid fa-right-from-bracket"></i>
                </button>
            </div>
        `;
    } else {
        navArea.innerHTML = `
            <button onclick="openAuthModal()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition shadow">
                Entrar / Cadastrar
            </button>
        `;
    }
}

function renderPets() {
    const searchInput = document.getElementById('searchInput');
    const filterSpecies = document.getElementById('filterSpecies');
    const filterSize = document.getElementById('filterSize');

    const search = searchInput ? searchInput.value.toLowerCase() : '';
    const species = filterSpecies ? filterSpecies.value : '';
    const size = filterSize ? filterSize.value : '';

    const filtered = pets.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search) || p.city.toLowerCase().includes(search) || p.breed.toLowerCase().includes(search);
        const matchSpecies = !species || p.species === species;
        const matchSize = !size || p.size === size;
        return matchSearch && matchSpecies && matchSize;
    });

    const grid = document.getElementById('petsGrid');
    const emptyState = document.getElementById('emptyState');
    const badge = document.getElementById('petCountBadge');

    if (badge) badge.innerText = `${filtered.length} pets`;

    if (!grid) return;

    if (filtered.length === 0) {
        grid.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    grid.innerHTML = filtered.map(pet => `
        <div class="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col">
            <div class="relative h-48 bg-slate-100 overflow-hidden">
                <img src="${pet.photo}" alt="${pet.name}" class="w-full h-full object-cover transition duration-300 hover:scale-105" onerror="this.src='https://placehold.co/600x400/e2e8f0/64748b?text=Sem+Foto'">
                <div class="absolute top-3 left-3 flex gap-1">
                    <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${pet.status === 'Disponível' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-white'}">
                        ${pet.status}
                    </span>
                </div>
                <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-slate-700">
                    ${pet.species}
                </div>
            </div>
            <div class="p-5 flex-grow flex flex-col justify-between space-y-4">
                <div>
                    <div class="flex items-baseline justify-between mb-1">
                        <h3 class="text-lg font-bold text-slate-800">${pet.name}</h3>
                        <span class="text-xs text-slate-500"><i class="fa-solid fa-location-dot text-emerald-500 mr-1"></i>${pet.city}</span>
                    </div>
                    <p class="text-xs font-medium text-slate-500 mb-2">${pet.breed} &bull; ${pet.age} &bull; Porte ${pet.size}</p>
                    <p class="text-sm text-slate-600 line-clamp-2">${pet.description}</p>
                </div>
                <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span class="text-xs text-slate-400">Por: <strong class="text-slate-600">${pet.tutorName}</strong></span>
                    ${pet.status === 'Disponível' ? `
                        <button onclick="openContactModal('${pet.id}')" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold px-3 py-1.5 rounded-xl text-xs transition flex items-center space-x-1">
                            <i class="fa-solid fa-heart"></i><span>Tenho Interesse</span>
                        </button>
                    ` : `
                        <span class="text-xs text-slate-400 italic font-medium">Já Adotado ❤️</span>
                    `}
                </div>
            </div>
        </div>
    `).join('');
}

function filterPets() {
    renderPets();
}

function renderMyPets() {
    if (!currentUser) return;
    const myPets = pets.filter(p => p.tutorId === currentUser.uid);
    const grid = document.getElementById('myPetsGrid');
    const emptyState = document.getElementById('myEmptyState');

    if (!grid) return;

    if (myPets.length === 0) {
        grid.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    grid.innerHTML = myPets.map(pet => `
        <div class="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col">
            <div class="relative h-44 bg-slate-100">
                <img src="${pet.photo}" alt="${pet.name}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/600x400/e2e8f0/64748b?text=Sem+Foto'">
                <div class="absolute top-3 left-3">
                    <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${pet.status === 'Disponível' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-white'}">
                        ${pet.status}
                    </span>
                </div>
            </div>
            <div class="p-5 flex-grow flex flex-col justify-between space-y-4">
                <div>
                    <h3 class="text-lg font-bold text-slate-800">${pet.name}</h3>
                    <p class="text-xs text-slate-500">${pet.breed} &bull; ${pet.city}</p>
                </div>
                <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button onclick="togglePetStatus('${pet.id}')" class="text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${pet.status === 'Disponível' ? 'border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100' : 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'}">
                        <i class="fa-solid fa-sync mr-1"></i> ${pet.status === 'Disponível' ? 'Marcar como Adotado' : 'Tornar Disponível'}
                    </button>
                    <button onclick="deletePet('${pet.id}')" class="text-slate-400 hover:text-red-600 text-sm p-1.5 rounded-lg transition" title="Excluir Anúncio">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function togglePetStatus(id) {
    const pet = pets.find(p => p.id === id);
    if (pet) {
        pet.status = pet.status === 'Disponível' ? 'Adotado' : 'Disponível';
        saveState();
        renderMyPets();
        showToast(pet.status === 'Adotado' ? 'Pet marcado como Adotado com sucesso!' : 'Pet marcado como Disponível!');
    }
}

function deletePet(id) {
    if (confirm('Tem certeza que deseja remover este anúncio?')) {
        pets = pets.filter(p => p.id !== id);
        saveState();
        renderMyPets();
        showToast('Anúncio removido com sucesso!');
    }
}

function openAuthModal() {
    document.getElementById('authModal').classList.remove('hidden');
}

function closeAuthModal() {
    document.getElementById('authModal').classList.add('hidden');
}

function toggleAuthMode() {
    authModeIsRegister = !authModeIsRegister;
    const title = document.getElementById('authModalTitle');
    const nameContainer = document.getElementById('nameFieldContainer');
    const submitBtn = document.getElementById('authSubmitBtn');
    const toggleText = document.getElementById('authToggleText');
    const toggleBtn = document.getElementById('authToggleBtn');

    if (authModeIsRegister) {
        title.innerText = 'Criar Nova Conta';
        nameContainer.classList.remove('hidden');
        document.getElementById('authName').required = true;
        submitBtn.innerText = 'Cadastrar';
        toggleText.innerText = 'Já tem uma conta?';
        toggleBtn.innerText = 'Entrar';
    } else {
        title.innerText = 'Entrar na Plataforma';
        nameContainer.classList.add('hidden');
        document.getElementById('authName').required = false;
        submitBtn.innerText = 'Entrar';
        toggleText.innerText = 'Não tem uma conta?';
        toggleBtn.innerText = 'Criar conta';
    }
}

function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const nameInput = document.getElementById('authName').value;

    if (authModeIsRegister) {
        currentUser = {
            uid: 'user_logged_' + email.split('@')[0],
            name: nameInput || 'Usuário',
            email: email
        };
        showToast('Conta criada com sucesso! Seja bem-vindo(a).');
    } else {
        currentUser = {
            uid: 'user_logged_' + email.split('@')[0],
            name: email.split('@')[0].toUpperCase(),
            email: email
        };
        showToast('Login realizado com sucesso!');
    }

    saveState();
    updateAuthNav();
    closeAuthModal();
    document.getElementById('authForm').reset();
}

function logout() {
    currentUser = null;
    saveState();
    updateAuthNav();
    navigateTo('home');
    showToast('Você saiu da sua conta.');
}

function checkAuthAndOpenPostModal() {
    if (!currentUser) {
        openAuthModal();
        showToast('Você precisa entrar na conta para cadastrar um pet.');
        return;
    }
    openPostModal();
}

function openPostModal() {
    document.getElementById('petForm').reset();
    document.getElementById('postPetModal').classList.remove('hidden');
}

function closePostModal() {
    document.getElementById('postPetModal').classList.add('hidden');
}

function handlePetSubmit(e) {
    e.preventDefault();
    if (!currentUser) {
        openAuthModal();
        return;
    }

    const newPet = {
        id: 'pet_' + Date.now(),
        name: document.getElementById('petName').value,
        species: document.getElementById('petSpecies').value,
        breed: document.getElementById('petBreed').value,
        age: document.getElementById('petAge').value,
        size: document.getElementById('petSize').value,
        city: document.getElementById('petCity').value,
        photo: document.getElementById('petPhoto').value,
        description: document.getElementById('petDescription').value,
        tutorName: currentUser.name,
        tutorEmail: currentUser.email,
        tutorId: currentUser.uid,
        status: 'Disponível'
    };

    pets.unshift(newPet);
    saveState();
    closePostModal();
    renderPets();
    showToast('Pet cadastrado com sucesso para adoção!');
}

let selectedPetForContact = null;
function openContactModal(id) {
    if (!currentUser) {
        openAuthModal();
        showToast('Faça login para demonstrar interesse.');
        return;
    }
    selectedPetForContact = pets.find(p => p.id === id);
    if (!selectedPetForContact) return;

    document.getElementById('contactModalTutor').innerText = selectedPetForContact.tutorName;
    document.getElementById('contactModalEmail').innerText = selectedPetForContact.tutorEmail;
    document.getElementById('contactModalPetName').innerText = selectedPetForContact.name;
    document.getElementById('interestMessage').value = `Olá ${selectedPetForContact.tutorName}, tenho muito interesse em adotar o(a) ${selectedPetForContact.name}! Gostaria de conversar sobre o processo.`;
    
    document.getElementById('contactModal').classList.remove('hidden');
}

function closeContactModal() {
    document.getElementById('contactModal').classList.add('hidden');
}

function sendInterestMessage() {
    closeContactModal();
    showToast('Mensagem enviada com sucesso para o tutor!');
}

function showToast(message) {
    const toast = document.getElementById('toastModal');
    const toastText = document.getElementById('toastText');
    if (!toast || !toastText) return;

    toastText.innerText = message;
    toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
    }, 3500);
}

document.addEventListener('DOMContentLoaded', () => {
    updateAuthNav();
    renderPets();
});