-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709051333
-- Remote name: m13b2c_e14_assessment_fixture
-- Remote SQL SHA-256: a101f749fecf891f0a9f03581035fa43b43757f900985a311ea055d806d53c17
-- Do not edit after reconciliation; corrections require a new migration.

insert into assessment.assessment_specs(activity_version_id,grading_mode,passing_score,max_attempts,time_limit_seconds,randomization_policy,feedback_policy)
values(app_private.e14_deterministic_uuid('e14:activity-version:v1'),'automatic',100,3,null,'{"shuffle_questions":false,"shuffle_options":false}'::jsonb,'{"mode":"immediate_per_option","show_correct_after":"final_failed_attempt"}'::jsonb)
on conflict (activity_version_id) do nothing;

insert into assessment.questions(id,activity_version_id,code,question_type,prompt,points,position,configuration)
values(app_private.e14_deterministic_uuid('e14:assessment-question'),app_private.e14_deterministic_uuid('e14:activity-version:v1'),'inputs_rules_outputs_check','single_choice','Qual elemento representa a regra do processo?',1,1,'{"required":true}'::jsonb)
on conflict (activity_version_id,code) do nothing;

insert into assessment.answer_options(id,question_id,code,label,value,is_correct,position) values
(app_private.e14_deterministic_uuid('e14:assessment-option:a'),app_private.e14_deterministic_uuid('e14:assessment-question'),'a','O valor do pedido','{"feedback":"O valor do pedido e a entrada."}'::jsonb,false,1),
(app_private.e14_deterministic_uuid('e14:assessment-option:b'),app_private.e14_deterministic_uuid('e14:assessment-question'),'b','A condicao valor do pedido maior ou igual a 100','{"feedback":"Correto. A condicao define o processamento."}'::jsonb,true,2),
(app_private.e14_deterministic_uuid('e14:assessment-option:c'),app_private.e14_deterministic_uuid('e14:assessment-question'),'c','O resultado frete gratis','{"feedback":"Frete gratis e a saida."}'::jsonb,false,3),
(app_private.e14_deterministic_uuid('e14:assessment-option:d'),app_private.e14_deterministic_uuid('e14:assessment-question'),'d','A conferencia final','{"feedback":"A conferencia e a validacao humana."}'::jsonb,false,4)
on conflict (question_id,code) do nothing;
