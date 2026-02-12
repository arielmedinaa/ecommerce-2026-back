export const FORMATOS_TEMPLATES = {
  // Template 1: Landing Hero Moderna
  HERO_MODERNA: {
    name: 'Hero Moderna',
    slug: 'hero-moderna',
    description: 'Landing page con hero section moderno y llamativo',
    type: 'react',
    category: 'corporativo',
    tags: ['moderno', 'minimalista', 'corporativo'],
    template: `
import React from 'react';

const HeroModerna = ({ 
  title = 'Transforma tu Negocio Digital', 
  subtitle = 'Soluciones innovadoras para hacer crecer tu empresa',
  ctaText = 'Comenzar Ahora',
  backgroundImage = '/api/placeholder/1920/1080'
}) => {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: \`url(\${backgroundImage})\` }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      </div>
      
      <nav className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="text-white text-2xl font-bold">TuMarca</div>
        <div className="hidden md:flex space-x-8">
          <a href="#features" className="text-white hover:text-blue-300 transition-colors">Características</a>
          <a href="#about" className="text-white hover:text-blue-300 transition-colors">Nosotros</a>
          <a href="#contact" className="text-white hover:text-blue-300 transition-colors">Contacto</a>
        </div>
        <button className="bg-white text-blue-900 px-6 py-2 rounded-full font-semibold hover:bg-blue-100 transition-colors">
          {ctaText}
        </button>
      </nav>
      
      <div className="relative z-10 flex items-center justify-center min-h-screen px-6">
        <div className="text-center max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            {title}
          </h1>
          <p className="text-xl md:text-2xl text-gray-200 mb-8 leading-relaxed">
            {subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transform hover:scale-105 transition-all duration-200 shadow-xl">
              {ctaText}
            </button>
            <button className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-blue-900 transition-all duration-200">
              Ver Demo
            </button>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
        <div className="animate-bounce">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default HeroModerna;
    `,
    config: {
      customizableSections: ['title', 'subtitle', 'ctaText', 'backgroundImage'],
      requiredProps: [],
      defaultStyles: {},
      dependencies: ['react']
    },
    variables: [
      { name: 'title', type: 'string', description: 'Título principal', required: false, defaultValue: 'Transforma tu Negocio Digital' },
      { name: 'subtitle', type: 'string', description: 'Subtítulo descriptivo', required: false, defaultValue: 'Soluciones innovadoras para hacer crecer tu empresa' },
      { name: 'ctaText', type: 'string', description: 'Texto del botón principal', required: false, defaultValue: 'Comenzar Ahora' },
      { name: 'backgroundImage', type: 'string', description: 'URL de imagen de fondo', required: false, defaultValue: '/api/placeholder/1920/1080' }
    ]
  },

  // Template 2: Landing Producto
  PRODUCTO_FEATURES: {
    name: 'Producto Features',
    slug: 'producto-features',
    description: 'Landing page enfocada en características de producto',
    type: 'react',
    category: 'producto',
    tags: ['producto', 'features', 'tecnología'],
    template: `
import React, { useState } from 'react';

const ProductoFeatures = ({
  title = 'Nuestro Producto Revolucionario',
  subtitle = 'Características que marcan la diferencia',
  features = [
    {
      icon: '🚀',
      title: 'Alto Rendimiento',
      description: 'Optimizado para máxima velocidad y eficiencia'
    },
    {
      icon: '🛡️',
      title: 'Seguridad Total',
      description: 'Protección de datos de nivel empresarial'
    },
    {
      icon: '📱',
      title: 'Responsive Design',
      description: 'Perfecto en cualquier dispositivo'
    }
  ]
}) => {
  const [activeFeature, setActiveFeature] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="text-2xl font-bold text-gray-900">ProductoApp</div>
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors">Características</a>
              <a href="#pricing" className="text-gray-700 hover:text-blue-600 transition-colors">Precios</a>
              <a href="#contact" className="text-gray-700 hover:text-blue-600 transition-colors">Contacto</a>
            </nav>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Prueba Gratuita
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            {title}
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            {subtitle}
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={\`p-8 rounded-xl border-2 transition-all duration-300 cursor-pointer \${
                  activeFeature === index
                    ? 'border-blue-500 bg-blue-50 shadow-lg transform scale-105'
                    : 'border-gray-200 hover:border-gray-300'
                }\`}
                onClick={() => setActiveFeature(index)}
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            ¿Listo para comenzar?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Únete a miles de clientes satisfechos
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors">
              Comenzar Gratis
            </button>
            <button className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-blue-600 transition-colors">
              Ver Demo
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProductoFeatures;
    `,
    config: {
      customizableSections: ['title', 'subtitle', 'features'],
      requiredProps: [],
      defaultStyles: {},
      dependencies: ['react']
    },
    variables: [
      { name: 'title', type: 'string', description: 'Título principal', required: false, defaultValue: 'Nuestro Producto Revolucionario' },
      { name: 'subtitle', type: 'string', description: 'Subtítulo descriptivo', required: false, defaultValue: 'Características que marcan la diferencia' },
      { name: 'features', type: 'array', description: 'Array de características del producto', required: false }
    ]
  },

  // Template 3: Landing SaaS
  SAAS_LANDING: {
    name: 'SaaS Landing',
    slug: 'saas-landing',
    description: 'Landing page optimizada para productos SaaS',
    type: 'react',
    category: 'saas',
    tags: ['saas', 'software', 'suscripción'],
    template: `
import React, { useState } from 'react';

const SaasLanding = ({
  productName = 'CloudFlow',
  tagline = 'La solución SaaS que tu negocio necesita',
  plans = [
    {
      name: 'Básico',
      price: '$29',
      period: '/mes',
      features: ['10 usuarios', '10GB almacenamiento', 'Soporte email'],
      highlighted: false
    },
    {
      name: 'Profesional',
      price: '$79',
      period: '/mes',
      features: ['50 usuarios', '100GB almacenamiento', 'Soporte 24/7', 'API access'],
      highlighted: true
    },
    {
      name: 'Enterprise',
      price: 'Personalizado',
      period: '',
      features: ['Usuarios ilimitados', 'Almacenamiento ilimitado', 'Soporte dedicado', 'SLA garantizado'],
      highlighted: false
    }
  ]
}) => {
  const [selectedPlan, setSelectedPlan] = useState(1);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="text-2xl font-bold text-indigo-600">{productName}</div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-indigo-600">Características</a>
              <a href="#pricing" className="text-gray-700 hover:text-indigo-600">Precios</a>
              <a href="#docs" className="text-gray-700 hover:text-indigo-600">Documentación</a>
              <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                Iniciar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-purple-50"></div>
        <div className="relative max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center bg-indigo-100 text-indigo-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            🎉 Nuevo: Dashboard mejorado
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            {tagline}
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Automatiza tus procesos, escala tu negocio y obtén insights valiosos con nuestra plataforma todo-en-uno.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button className="bg-indigo-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-indigo-700 transform hover:scale-105 transition-all">
              Prueba Gratuita de 14 días
            </button>
            <button className="bg-white border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg font-semibold text-lg hover:border-gray-400 transition-colors">
              Ver Demo
            </button>
          </div>
          <p className="text-sm text-gray-500">No se requiere tarjeta de crédito</p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-indigo-600 mb-2">10K+</div>
              <div className="text-gray-600">Clientes Activos</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-indigo-600 mb-2">99.9%</div>
              <div className="text-gray-600">Uptime</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-indigo-600 mb-2">24/7</div>
              <div className="text-gray-600">Soporte</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-indigo-600 mb-2">4.9★</div>
              <div className="text-gray-600">Satisfacción</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Precios simples y transparentes
            </h2>
            <p className="text-xl text-gray-600">
              Elige el plan perfecto para tu negocio
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={\`relative p-8 rounded-2xl border-2 transition-all duration-300 \${
                  plan.highlighted
                    ? 'border-indigo-500 bg-indigo-50 shadow-xl transform scale-105'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }\`}
                onClick={() => setSelectedPlan(index)}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Más Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600 ml-1">{plan.period}</span>
                  </div>
                </div>
                
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button className={\`w-full py-3 rounded-lg font-semibold transition-colors \${
                  plan.highlighted
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }\`}>
                  {plan.highlighted ? 'Comenzar Ahora' : 'Seleccionar Plan'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default SaasLanding;
    `,
    config: {
      customizableSections: ['productName', 'tagline', 'plans'],
      requiredProps: [],
      defaultStyles: {},
      dependencies: ['react']
    },
    variables: [
      { name: 'productName', type: 'string', description: 'Nombre del producto SaaS', required: false, defaultValue: 'CloudFlow' },
      { name: 'tagline', type: 'string', description: 'Eslogan del producto', required: false, defaultValue: 'La solución SaaS que tu negocio necesita' },
      { name: 'plans', type: 'array', description: 'Planes de precios', required: false }
    ]
  },

  // Template 4: Landing Minimalista
  MINIMALISTA: {
    name: 'Minimalista Clean',
    slug: 'minimalista-clean',
    description: 'Landing page minimalista con diseño limpio y elegante',
    type: 'react',
    category: 'minimalista',
    tags: ['minimalista', 'limpio', 'elegante'],
    template: `
import React from 'react';

const Minimalista = ({
  title = 'Menos es Más',
  subtitle = 'Diseño minimalista para máxima impacto',
  content = 'Creamos experiencias digitales simples y efectivas que conectan con tu audiencia.',
  ctaText = 'Hablemos'
}) => {
  return (
    <div className="min-h-screen bg-white">
      {/* Simple Navigation */}
      <header className="absolute top-0 left-0 right-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-light text-gray-900">Studio</div>
            <button className="text-gray-700 hover:text-black transition-colors">
              Menu
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-light text-gray-900 mb-6 leading-tight tracking-tight">
            {title}
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed font-light">
            {subtitle}
          </p>
          <p className="text-lg text-gray-500 mb-16 max-w-2xl mx-auto leading-relaxed">
            {content}
          </p>
          <button className="border-b-2 border-gray-900 text-gray-900 pb-2 font-medium hover:border-gray-700 transition-colors">
            {ctaText}
          </button>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="border-t border-gray-200"></div>
      </div>

      {/* Content Section */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-24 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-light text-gray-900 mb-6 leading-tight">
                Enfocados en lo esencial
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-8">
                Eliminamos el ruido y nos concentramos en lo que realmente importa: 
                crear conexiones significativas entre tu marca y tu audiencia a través 
                de diseño intencional y funcional.
              </p>
              <a href="#" className="text-gray-900 hover:text-gray-700 transition-colors">
                Ver nuestro trabajo →
              </a>
            </div>
            <div className="bg-gray-100 aspect-square rounded-lg"></div>
          </div>
        </div>
      </section>

      <section className="py-32 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-16">
            <div>
              <h3 className="text-xl font-medium text-gray-900 mb-4">Diseño</h3>
              <p className="text-gray-600 leading-relaxed">
                Minimalismo funcional que prioriza la experiencia del usuario por encima de todo.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-medium text-gray-900 mb-4">Tecnología</h3>
              <p className="text-gray-600 leading-relaxed">
                Las últimas tecnologías web para garantizar rendimiento y compatibilidad.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-medium text-gray-900 mb-4">Resultados</h3>
              <p className="text-gray-600 leading-relaxed">
                Medimos el éxito a través de métricas reales y objetivos de negocio alcanzados.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-light text-gray-900 mb-6">
            ¿Listos para crear algo extraordinario?
          </h2>
          <p className="text-lg text-gray-600 mb-12">
            Envíanos un mensaje y comencemos a trabajar juntos en tu próximo proyecto.
          </p>
          <button className="border border-gray-900 text-gray-900 px-8 py-3 font-medium hover:bg-gray-900 hover:text-white transition-colors">
            Contactar
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-2xl font-light text-gray-900 mb-4 md:mb-0">Studio</div>
            <div className="flex items-center space-x-8 text-sm text-gray-600">
              <a href="#" className="hover:text-gray-900 transition-colors">Instagram</a>
              <a href="#" className="hover:text-gray-900 transition-colors">LinkedIn</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Email</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Minimalista;
    `,
    config: {
      customizableSections: ['title', 'subtitle', 'content', 'ctaText'],
      requiredProps: [],
      defaultStyles: {},
      dependencies: ['react']
    },
    variables: [
      { name: 'title', type: 'string', description: 'Título principal', required: false, defaultValue: 'Menos es Más' },
      { name: 'subtitle', type: 'string', description: 'Subtítulo descriptivo', required: false, defaultValue: 'Diseño minimalista para máxima impacto' },
      { name: 'content', type: 'string', description: 'Contenido principal', required: false, defaultValue: 'Creamos experiencias digitales simples y efectivas que conectan con tu audiencia.' },
      { name: 'ctaText', type: 'string', description: 'Texto del llamado a la acción', required: false, defaultValue: 'Hablemos' }
    ]
  }
};

export default FORMATOS_TEMPLATES;